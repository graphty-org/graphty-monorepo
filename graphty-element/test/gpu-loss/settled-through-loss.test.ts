/**
 * @file A force layout that had settled stays settled, and its nodes stay where they were drawn, when the WebGPU
 * device is lost and the element rebuilds the layout on the device it brings back (issue #9929). Before the fix the
 * rebuild ran the whole schedule again from the settled arrangement and every node moved about 20 px. A layout still
 * running at the loss resumes and settles after it. Both under `"auto"` and under `"required"`, where the layout has
 * no simulation at all while the device is gone, so its settled state must be carried through that gap. And
 * `waitForSettled()` after the recovery resolves only once the layout reads settled, including one the loss
 * interrupted mid-run (issue #9988).
 *
 * The layout's own device is destroyed: under `"auto"` that is the one drawn with, while under `"required"` the
 * accelerator here first runs on a device of its own.
 *
 * Runs in the full run's graphty-element-gpu-loss shard. By hand: npx vitest run --project=gpu-loss
 * test/gpu-loss/settled-through-loss.test.ts
 */

import { assert, describe, it, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import { deviceOf, layoutOf, nextFrame, running } from "./shared-device";

/** Nodes the shared-device graph holds (shared-device.ts). */
const IDS = Array.from({ length: 200 }, (_, i) => `n${String(i)}`);

/** The policies a loss is recovered under. */
const POLICIES = ["auto", "required"] as const;

/**
 * Opens a graph with a running layout, recording every device the page opens from now on.
 * @param path - The render path.
 * @param maxIter - Iterations before the layout rests.
 * @param policy - The acceleration policy.
 * @returns The graph, and a call that destroys the layout's device and waits for the accelerator to come back.
 */
async function openLosable(
    path: "objects" | "batched",
    maxIter: number,
    policy: (typeof POLICIES)[number],
): Promise<{ graph: Graph; loseAndRecover: () => Promise<void> }> {
    const requested = vi.spyOn(GPUAdapter.prototype, "requestDevice");
    const graph = await running(path, maxIter, "webgpu", undefined, policy);
    const loseAndRecover = async (): Promise<void> => {
        const { accelerator } = graph.acceleration;
        const drawing = await deviceOf(graph);
        const devices = await Promise.all(requested.mock.results.map(async (r) => (await r.value) as GPUDevice));
        // The accelerator's own device when it opened one, otherwise the one it shares with the renderer.
        const own = devices.filter((device) => device !== drawing);
        for (const device of own.length > 0 ? own : [drawing]) {
            device.destroy();
        }

        while (graph.acceleration.accelerator === accelerator || graph.acceleration.accelerator === null) {
            assert.notStrictEqual(graph.acceleration.status.state, "unavailable", "the accelerator comes back");
            await nextFrame();
        }
    };
    return { graph, loseAndRecover };
}

describe("a force layout through a device loss", () => {
    for (const policy of POLICIES) {
        for (const path of ["batched", "objects"] as const) {
            it(`leaves a settled layout settled through a device loss (${path}, ${policy})`, async () => {
                const { graph, loseAndRecover } = await openLosable(path, 150, policy);
                await graph.waitForSettled();
                await graph.waitForStableFrame();
                const before = IDS.map((id) => graph.nodeScreenPosition(id));

                await loseAndRecover();

                await graph.waitForSettled();
                await graph.waitForStableFrame();
                const after = IDS.map((id) => graph.nodeScreenPosition(id));
                const moved = Math.max(
                    ...before.map((b, i) => {
                        const a = after[i];
                        return b === undefined || a === undefined ? Infinity : Math.hypot(a.x - b.x, a.y - b.y);
                    }),
                );
                assert.isTrue(graph.getLayoutManager().isSettled, "the layout reads settled");
                assert.isBelow(
                    moved,
                    1,
                    `no node moved on screen (worst ${String(moved)} px; ${String(layoutOf(graph).iterationsDone)} iterations after)`,
                );
            });
        }

        it(`resumes a layout still running at a device loss, and settles it (${policy})`, async () => {
            const { graph, loseAndRecover } = await openLosable("batched", 1000, policy);
            assert.isFalse(layoutOf(graph).isSettled, "the layout is still running at the loss");

            await loseAndRecover();
            while (!layoutOf(graph).isSettled) {
                await nextFrame();
            }

            // The rebuilt simulation counts from zero: a layout frozen at the loss and reading settled ran none.
            assert.isAbove(layoutOf(graph).iterationsDone, 0, "the rebuilt layout ran");
        });

        for (const [at, maxIter] of [
            ["settled", 150],
            ["running", 1000],
        ] as const) {
            it(`waitForSettled after a device loss resolves once the layout is settled (${at} at the loss, ${policy})`, async () => {
                const { graph, loseAndRecover } = await openLosable("batched", maxIter, policy);
                if (at === "settled") {
                    await graph.waitForStableFrame();
                }

                await loseAndRecover();
                await graph.waitForSettled();

                assert.isTrue(graph.getLayoutManager().isSettled, "the layout reads settled");
                assert.isFalse(graph.getLayoutManager().running, "the layout is not running");
            });
        }
    }
});
