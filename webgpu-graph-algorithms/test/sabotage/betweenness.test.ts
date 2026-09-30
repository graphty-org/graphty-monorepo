/**
 * Spec 11.9 item 1 for the six betweenness kernels: every SABOTAGE row of `bc-finalize`, `bc-forward`,
 * `bc-backward`, `bc-gather`, `bc-edge-gather` and `bc-forward-edge` is spliced into the normative body and compiled
 * on a FRESH context, and the SAME check that passes on the real kernels -- betweennessReport: exact karate in both
 * forward forms and its edge scores, the path's vertex and edge closed forms, a directed random graph two sources per
 * batch in both forward forms, and the overflow flag on the layered fixture and its control, each as an error /
 * tolerance ratio at 1e-4 -- fails on the mutant by at least minFactor. No row is caught by a timing.
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { betweennessReport } from "../helpers/betweenness.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const MEASURED: readonly KernelId[] = [
    "bc-finalize",
    "bc-forward",
    "bc-backward",
    "bc-gather",
    "bc-edge-gather",
    "bc-forward-edge",
];

describe("sabotage: the betweenness kernels (spec 11.9 item 1)", () => {
    it("the real kernels pass the check", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-betweenness" });
        try {
            const report = await betweennessReport(ctx);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    }, 120_000);

    for (const id of MEASURED) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => betweennessReport(ctx));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            }, 120_000);
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const id of MEASURED) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
