/**
 * Spec 11.9 item 1 for the group-by-key and label propagation (the P11 plan's P11-T5 Step 4 and P11-T6 Step 5): every
 * SABOTAGE row of `group-by-key-row` and `lpa-step` is spliced into the normative body and compiled on a FRESH
 * context, and the SAME check that passes on the real kernels fails on the mutant by at least minFactor. The checks
 * are bitwise (test/helpers/structure.ts): the group-by rows weighted and not in every tier split, with the exhausted
 * flag required to stay 0, and label propagation's labels on karate, a 300-node path that needs more than one
 * submit of passes and the two-node path the direction rule exists for -- any mismatch, and any throw, is Infinity.
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { assertCheckPasses, type CheckReport, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { groupReport, labelPropagationReport } from "../helpers/structure.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["group-by-key-row", "lpa-step"];

/** The check each id's rows are measured by. */
function reportOf(id: KernelId, ctx: GpuContext): Promise<CheckReport> {
    return id === "group-by-key-row" ? groupReport(ctx) : labelPropagationReport(ctx);
}

describe("sabotage: the group-by-key and label propagation (spec 11.9 item 1; P11)", () => {
    it("the real kernels pass both checks (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-community" });
        try {
            for (const report of [await groupReport(ctx), await labelPropagationReport(ctx)]) {
                expect(report.worst, report.worstLabel).toBe(0);
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
