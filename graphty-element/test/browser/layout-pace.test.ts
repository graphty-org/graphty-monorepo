import { afterEach, assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import type { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { RenderManager } from "../../src/managers/RenderManager";
import type { UpdateManager } from "../../src/managers/UpdateManager";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/**
 * A force layout converges after a fixed number of STEPS. It used to take exactly one step per
 * drawn frame, so the time it took to settle was that step count times the cost of a frame: the
 * graphty app's college-football sample settles after 162 steps, which is 3 s at 60 frames a
 * second and more than 30 s on a software-rendered CI runner drawing a frame every 190 ms.
 *
 * The layout now keeps to the nominal 60 steps a second whatever the frame rate is, so a slow
 * frame takes the steps a fast one would have taken in the same time. The frames are pumped by
 * hand with a stated frame time, so what is counted here is passes, never milliseconds.
 */
describe("layout pace", () => {
    let graph: Graph | undefined;
    let release: (() => void) | undefined;

    afterEach(() => {
        release?.();
        if (graph) {
            cleanupTestGraph(graph);
        }
        graph = undefined;
    });

    async function settle(frameMs: number): Promise<{ passes: number; steps: number }> {
        graph = await createTestGraph();
        const inner = graph as unknown as { renderManager: RenderManager; updateManager: UpdateManager };
        release = inner.renderManager.holdFrames();

        // A ring with chords: enough structure that ngraph needs close to a hundred steps.
        const count = 60;
        await graph.addNodes(Array.from({ length: count }, (_, i) => ({ id: String(i) })));
        await graph.addEdges(
            Array.from({ length: count }, (_, i) => [
                { src: String(i), dst: String((i + 1) % count) },
                { src: String(i), dst: String((i + 7) % count) },
            ]).flat(),
        );
        await graph.setLayout("ngraph", {});

        const layoutManager = graph.getLayoutManager();
        const engine = layoutManager.layoutEngine as NGraphEngine;
        let passes = 0;

        while (!engine.isSettled && passes < 5000) {
            inner.updateManager.update(frameMs);
            passes++;
        }

        const steps = engine._stepCount;
        release();
        release = undefined;
        cleanupTestGraph(graph);
        graph = undefined;

        return { passes, steps };
    }

    it("settles in the same steps and proportionally fewer passes when each frame is slow", async () => {
        const fast = await settle(1000 / 60);
        const slow = await settle(200);

        assert.isAbove(fast.steps, 60, "the test graph must need many steps to settle");
        assert.equal(fast.passes, fast.steps, "at 60 frames a second the layout takes one step a frame");
        assert.equal(slow.steps, fast.steps, "the pace changes when steps are taken, never where the layout ends");

        // 200 ms is 12 nominal frames, so a slow frame owes 12 steps.
        assert.isAtMost(slow.passes, Math.ceil(fast.steps / 12) + 1, `settled in ${slow.passes} passes of 200 ms`);
    });
});
