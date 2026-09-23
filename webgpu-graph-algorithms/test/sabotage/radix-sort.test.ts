/**
 * Spec 11.9 item 1 for the two radix kernels (P4-T4): every SABOTAGE row of `radix-hist` and `radix-scatter` is
 * spliced into the normative body and compiled on a FRESH context, and the SAME bitwise check that passes on the
 * real kernels (radixReport at 4097 pairs, 24 bits: seventeen workgroups, three passes) fails on the mutant by at
 * least minFactor -- any mismatch is Infinity. The first block is the coverage loop of test/sabotage/coverage.test.ts
 * applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { radixReport } from "../helpers/radix-sort.js";
import { assertCheckPasses, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["radix-hist", "radix-scatter"];
const COUNT = 4097;
const BITS = 24;
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("sabotage: radix-hist and radix-scatter (spec 11.9 item 1; P4-T4)", () => {
    it("each id has three rows naming the radix test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect((SABOTAGE["radix-hist"] ?? []).map((m) => m.name)).toEqual([
            "group-major-table",
            "shift-ignored",
            "last-key-uncounted",
        ]);
        expect((SABOTAGE["radix-scatter"] ?? []).map((m) => m.name)).toEqual([
            "rank-not-advanced",
            "values-not-permuted",
            "offset-of-group-zero",
        ]);
        for (const id of IDS) {
            const { body } = KERNELS[id];
            const names = new Set<string>();
            for (const m of SABOTAGE[id] ?? []) {
                expect(names.has(m.name), `${id}: duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace).not.toBe(m.find);
                expect(m.minFactor).toBeGreaterThanOrEqual(10);
                expect(m.test).toBe("test/primitives/radix-sort.test.ts");
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
                const mutated = sabotagedBody(id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        }
    });

    it("the real kernels pass the bitwise check at 4097 / 24 bits (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-radix" });
        try {
            const report = await radixReport(ctx, COUNT, BITS);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the bitwise check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => radixReport(ctx, COUNT, BITS));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            });
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const id of IDS) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
