/**
 * @file A force layout that had settled stays settled, and its nodes stay where they were drawn, when the shared
 * WebGPU device is lost and the element rebuilds the layout on the device it brings back (issue #9929). Before the
 * fix the rebuild ran the whole schedule again from the settled arrangement and every node moved about 20 px.
 *
 * Runs in the full run's graphty-element-gpu-loss shard. By hand: npx vitest run --project=gpu-loss
 * test/gpu-loss/settled-through-loss.test.ts
 */

import { assert, describe, it } from "vitest";

import { deviceOf, layoutOf, nextFrame, running } from "./shared-device";

/** Nodes the shared-device graph holds (shared-device.ts). */
const IDS = Array.from({ length: 200 }, (_, i) => `n${String(i)}`);

describe("a settled layout through a shared-device loss", () => {
    for (const path of ["batched", "objects"] as const) {
        it(`leaves a settled layout settled through a shared-device loss (${path})`, async () => {
            const graph = await running(path, 150);
            await graph.waitForSettled();
            await graph.waitForStableFrame();
            const before = IDS.map((id) => graph.nodeScreenPosition(id));

            const { accelerator } = graph.acceleration;
            (await deviceOf(graph)).destroy();
            while (graph.acceleration.accelerator === accelerator || graph.acceleration.accelerator === null) {
                await nextFrame();
            }

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
});
