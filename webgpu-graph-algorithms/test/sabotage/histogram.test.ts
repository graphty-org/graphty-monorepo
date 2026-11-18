/**
 * Spec 11.9 item 1 for the histogram and counting-scatter kernels (P4-T3): every SABOTAGE row of `histogram` and
 * `counting-scatter` is spliced into the normative body and compiled on a FRESH context, and the SAME bitwise check
 * that passes on the real kernels (histogramReport for the histogram rows, countingSortReport -- outStart, the
 * permutation, the key sequence -- for the scatter rows, both over 2^20 x gpuScale keys in 4096 bins) fails on the
 * mutant by at least minFactor: any mismatch is Infinity, and `cursor-not-advanced` is caught by the permutation
 * check (duplicate outputs, unwritten slots). The first block is the coverage loop of test/sabotage/coverage.test.ts
 * applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { countingSortReport, histogramReport } from "../helpers/histogram.js";
import { assertCheckPasses, type CheckReport, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["histogram", "counting-scatter"];
const BINS = 4096;

/** The check each id's rows are measured by. */
function reportOf(id: KernelId, ctx: GpuContext): Promise<CheckReport> {
    const count = Math.ceil(2 ** 20 * gpuScale());
    return id === "histogram" ? histogramReport(ctx, count, BINS) : countingSortReport(ctx, count, BINS);
}

describe("sabotage: histogram and counting-scatter (spec 11.9 item 1; P4-T3)", () => {
    it("each id has three rows naming the histogram test", () => {
        expect((SABOTAGE.histogram ?? []).map((m) => m.name)).toEqual([
            "plain-store",
            "last-key-skipped",
            "bin-off-by-one",
        ]);
        expect((SABOTAGE["counting-scatter"] ?? []).map((m) => m.name)).toEqual([
            "cursor-not-advanced",
            "start-ignored",
            "index-off-by-one",
        ]);
        for (const id of IDS) {
            for (const m of SABOTAGE[id] ?? []) {
                expect(m.test).toBe("test/primitives/histogram.test.ts");
            }
        }
    });

    it("the real kernels pass both bitwise checks (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-histogram" });
        try {
            for (const id of IDS) {
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
            it(`${id}/${mutation.name}: fails the bitwise check by >= ${mutation.minFactor}x`, async (t) => {
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
