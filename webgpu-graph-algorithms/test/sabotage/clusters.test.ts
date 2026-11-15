/**
 * Spec 11.9 item 1 for the cluster kernels (issue #3257): every SABOTAGE row is spliced into the normative body and
 * compiled on a fresh context, and the same check that passes on the real kernels (the stage against an f64 sum, under
 * each model's law) fails on the mutant by at least minFactor.
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId } from "../../src/kernels.js";
import { clusterReport, clusterScene } from "../helpers/clusters.js";
import { assertCheckPasses, type CheckReport, mergeReports, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["cluster-centroid", "cluster-pull"];

async function report(ctx: GpuContext): Promise<CheckReport> {
    return mergeReports([
        await clusterReport(ctx, clusterScene(3000, 0)),
        await clusterReport(ctx, clusterScene(3000, 1)),
        await clusterReport(ctx, clusterScene(3000, 2)),
    ]);
}

describe("sabotage: the cluster kernels (issue #3257)", () => {
    it("the real kernels pass the check (factor below 1)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-clusters" });
        assertCheckPasses(await report(ctx));
        ctx.dispose();
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const r = await withSabotage(id, mutation, report);
                expect(r.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => {
                    assertCheckPasses(r);
                }).toThrow();
            });
        }
    }
});
