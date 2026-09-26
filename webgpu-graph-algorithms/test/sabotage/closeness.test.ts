/**
 * Spec 11.9 item 1 for the two closeness kernels (P8-T11): every SABOTAGE row of `closeness-sweep` and
 * `closeness-reduce` is spliced into the normative body and compiled on a FRESH context, and the SAME check that
 * passes on the real kernels -- closenessReport: the exact `reached` and 64-bit `sum` of every source and the f32
 * scores of karate, the 70-node path and the 200-funnel against the oracle, every `newCount` word zero after its
 * batch, and the hand-seeded one-workgroup `closeness-reduce` role 0 (the 64-bit carry, which no runnable graph
 * reaches), all bitwise (any mismatch is Infinity; a driver refusal is the maximal miss) -- fails on the mutant by at
 * least minFactor. No row is caught by a timing. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { closenessReport } from "../helpers/closeness.js";
import { assertCheckPasses, type Mutation, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLOSENESS_TEST = "test/algorithms/closeness.test.ts";

/** The two kernels and the rows each must carry, by name. */
const MEASURED: readonly { readonly id: KernelId; readonly names: readonly string[] }[] = [
    { id: "closeness-sweep", names: ["already-visited-recounted", "next-bits-not-set", "source-word-not-bit"] },
    { id: "closeness-reduce", names: ["distance-is-the-level", "reached-not-accumulated", "carry-dropped"] },
];

describe("sabotage: closeness-sweep and closeness-reduce (spec 11.9 item 1; P8-T11)", () => {
    for (const { id, names } of MEASURED) {
        const rows: readonly Mutation[] = SABOTAGE[id] ?? [];

        it(`${id} has its three rows naming the closeness test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique`, () => {
            expect(rows.map((m) => m.name)).toEqual(names);
            const { body } = KERNELS[id];
            const seen = new Set<string>();
            for (const m of rows) {
                expect(seen.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
                seen.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace).not.toBe(m.find);
                expect(m.minFactor).toBeGreaterThanOrEqual(10);
                expect(m.test).toBe(CLOSENESS_TEST);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
                const mutated = sabotagedBody(id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        });
    }

    it("the real kernels pass the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-closeness" });
        try {
            const report = await closenessReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    }, 120_000);

    for (const { id } of MEASURED) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => closenessReport(ctx));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            }, 120_000);
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const { id } of MEASURED) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
