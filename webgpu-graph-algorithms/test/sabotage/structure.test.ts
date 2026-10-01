/**
 * Spec 11.9 item 1 for the graph build and triangle counting (the P11 plan's P11-T3 Step 7 and P11-T8 Step 5): every
 * SABOTAGE row of `coo-emit`, `run-flags`, `coo-scatter`, `orient-flags` and `tri-intersect` is spliced into the
 * normative body and compiled on a FRESH context, and the SAME check that passes on the real kernels fails on the
 * mutant by at least minFactor. The checks are bitwise (test/helpers/structure.ts): the simple symmetric build of
 * karate and of a directed weighted multigraph against the reference, the cursor-mode build of shuffled arcs, the
 * precondition flag on out-of-order arcs, and triangle counts in all three intersection modes -- any mismatch, and
 * any throw, is Infinity.
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { assertCheckPasses, type CheckReport, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { buildReport, triangleReport } from "../helpers/structure.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const BUILD: readonly KernelId[] = ["coo-emit", "run-flags", "coo-scatter"];
const TRIANGLES: readonly KernelId[] = ["orient-flags", "tri-intersect"];

/** The check each id's rows are measured by. */
function reportOf(id: KernelId, ctx: GpuContext): Promise<CheckReport> {
    return BUILD.includes(id) ? buildReport(ctx) : triangleReport(ctx);
}

describe("sabotage: the graph build and triangle counting (spec 11.9 item 1; P11)", () => {
    it("the real kernels pass both checks (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-structure" });
        try {
            for (const report of [await buildReport(ctx), await triangleReport(ctx)]) {
                expect(report.worst, report.worstLabel).toBe(0);
                assertCheckPasses(report);
            }
        } finally {
            ctx.dispose();
        }
    });

    for (const id of [...BUILD, ...TRIANGLES]) {
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
        for (const id of [...BUILD, ...TRIANGLES]) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
