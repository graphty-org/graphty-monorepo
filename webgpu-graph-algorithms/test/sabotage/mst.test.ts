/**
 * Spec 11.9 item 1 for Boruvka's minimum spanning forest (the P11 plan's P11-T4 Step 5): every SABOTAGE row of
 * `mst-best` and `mst-link` is spliced into the normative body and compiled on a FRESH context, and the SAME check that
 * passes on the real kernels (test/helpers/mst.ts: the device forest against `kruskalMST` on ties, negative weights, a
 * deep path, a forest and a directed multigraph) fails on the mutant by at least minFactor; a differing edge set, and
 * any throw, is Infinity.
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { mstReport } from "../helpers/mst.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["mst-best", "mst-link"];

describe("sabotage: Boruvka's minimum spanning forest (spec 11.9 item 1; P11-T4)", () => {
    it("the real kernels pass the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-mst" });
        try {
            const report = await mstReport(ctx);
            expect(report.worst, report.worstLabel).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, mstReport);
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
