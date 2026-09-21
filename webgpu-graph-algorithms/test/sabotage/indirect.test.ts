/**
 * Spec 11.9 item 1 for the indirect finalize kernel (P4-T1): every SABOTAGE row of `indirect-finalize` is spliced
 * into the normative body and compiled on a FRESH context, and the SAME bitwise check that passes on the real kernel
 * (indirectFinalizeReport: ratioOf(|a - b|, 0) per args word against planIndirect's host twin) fails on the mutant
 * by at least minFactor -- any mismatch is Infinity. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { indirectFinalizeReport } from "../helpers/indirect.js";
import { assertCheckPasses, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "indirect-finalize";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROWS = SABOTAGE[ID] ?? [];

describe("sabotage: indirect-finalize (spec 11.9 item 1; P4-T1)", () => {
    it("has three rows naming the indirect test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect(ROWS.map((m) => m.name)).toEqual(["ceil-dropped", "split-never-taken", "slot-stride-twelve"]);
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
            expect(m.test).toBe("test/kernel/indirect.test.ts");
            expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
            const mutated = sabotagedBody(ID, m);
            expect(mutated).not.toBe(body);
            expect(mutated.includes(m.replace)).toBe(true);
            expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
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
