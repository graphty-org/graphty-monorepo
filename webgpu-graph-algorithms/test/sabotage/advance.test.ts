/**
 * Spec 11.9 item 1 for the `advance-expand` kernel (P8-T5): every SABOTAGE row is spliced into the normative body
 * and compiled on a FRESH context, and the SAME check that passes on the real kernel -- advanceReport: the sorted
 * edge queue and the three counters against the nested-loop oracle over the reversed karate vertex set, the grid's
 * levels and the star hub, plus the overflow case with the faked capacity, all bitwise (any mismatch is Infinity) --
 * fails on the mutant by at least minFactor. The first block is the coverage loop of test/sabotage/coverage.test.ts
 * applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { advanceReport } from "../helpers/advance.js";
import { assertCheckPasses, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "advance-expand";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROWS = SABOTAGE[ID] ?? [];

describe("sabotage: advance-expand (spec 11.9 item 1; P8-T5)", () => {
    it("has five rows naming the advance test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect(ROWS.map((m) => m.name)).toEqual([
            "scan-result-dropped",
            "lower-bound-not-upper",
            "per-lane-reservation",
            "last-entry-skipped",
            "unclamped-not-counted",
        ]);
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
            expect(m.test).toBe("test/primitives/advance.test.ts");
            expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
            const mutated = sabotagedBody(ID, m);
            expect(mutated).not.toBe(body);
            expect(mutated.includes(m.replace)).toBe(true);
            expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
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
    }, 120_000);

    for (const mutation of ROWS) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => advanceReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        }, 120_000);
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
