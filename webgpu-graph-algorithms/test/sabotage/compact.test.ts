/**
 * Spec 11.9 item 1 for the three compact / dedupe kernels (P8-T3): every SABOTAGE row of `compact-scatter`,
 * `dedupe-claim` and `dedupe-filter` is spliced into the normative body and compiled on a FRESH context, and the SAME
 * check that passes on the real kernels -- compactReport, bitwise over `out` and the count word for the 4,097-entry
 * alternating case; dedupeReport, the sorted surviving SET and the count word for the 4,097-entry case where one
 * vertex appears 1,000 times before a reversed tail -- fails on the mutant by at least minFactor: any mismatch is
 * Infinity. The first block is the coverage loop of test/sabotage/coverage.test.ts applied to these rows (P8 is not
 * in SABOTAGE_PHASES until P8-T15).
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { compactReport, dedupeReport } from "../helpers/compact.js";
import { assertCheckPasses, type CheckReport, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["compact-scatter", "dedupe-claim", "dedupe-filter"];
const COUNT = 4097;

/** The check each id's rows are measured by. */
function reportOf(id: KernelId, ctx: GpuContext): Promise<CheckReport> {
    return id === "compact-scatter" ? compactReport(ctx, COUNT) : dedupeReport(ctx, COUNT);
}

describe("sabotage: compact-scatter, dedupe-claim and dedupe-filter (spec 11.9 item 1; P8-T3)", () => {
    it("each id has three rows naming the compact test", () => {
        expect((SABOTAGE["compact-scatter"] ?? []).map((m) => m.name)).toEqual([
            "flag-test-inverted",
            "total-from-offsets-only",
            "last-element-skipped",
        ]);
        expect((SABOTAGE["dedupe-claim"] ?? []).map((m) => m.name)).toEqual([
            "claims-own-slot",
            "claims-zero",
            "last-entry-unclaimed",
        ]);
        expect((SABOTAGE["dedupe-filter"] ?? []).map((m) => m.name)).toEqual([
            "keeps-everything",
            "inclusive-off-by-one",
            "aggregate-from-lane-zero",
        ]);
        for (const id of IDS) {
            for (const m of SABOTAGE[id] ?? []) {
                expect(m.test).toBe("test/primitives/compact.test.ts");
            }
        }
    });

    it("the real kernels pass both checks at 4097 (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-compact" });
        try {
            for (const id of ["compact-scatter", "dedupe-filter"] as const) {
                const report = await reportOf(id, ctx);
                expect(report.worst, id).toBe(0);
                assertCheckPasses(report);
            }
        } finally {
            ctx.dispose();
        }
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => reportOf(id, ctx));
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
