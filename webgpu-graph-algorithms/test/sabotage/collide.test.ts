/**
 * Spec 11.9 item 1 for the collision kernels (issue #3256): every SABOTAGE row is spliced into the normative body and
 * compiled on a fresh context, and the same oracle check that passes on the real kernels (one sweep against the f64
 * oracle in 2D, 3D and flat) fails on the mutant by at least minFactor.
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId } from "../../src/kernels.js";
import { collideReport, collideScene } from "../helpers/collide.js";
import { assertCheckPasses, type CheckReport, mergeReports, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["collide-cell-key", "collide-gather", "collide-apply"];

async function report(ctx: GpuContext): Promise<CheckReport> {
    return mergeReports([
        await collideReport(ctx, collideScene(400, 2)),
        await collideReport(ctx, collideScene(400, 3)),
        await collideReport(ctx, collideScene(400, 3, true)),
    ]);
}

describe("sabotage: the collision kernels (issue #3256)", () => {
    it("the real kernels pass the oracle check (factor below 1)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-collide" });
        assertCheckPasses(await report(ctx));
        ctx.dispose();
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the oracle check by >= ${mutation.minFactor}x`, async (t) => {
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
