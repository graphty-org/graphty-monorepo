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

    async function settle(
        frameMs: number,
        minDelta = 0,
    ): Promise<{ passes: number; steps: number; x: number }> {
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
        graph.setLayoutBehavior({ layout: { minDelta } });
        await graph.setLayout("ngraph", {});

        const layoutManager = graph.getLayoutManager();
        const engine = layoutManager.layoutEngine as NGraphEngine;
        let passes = 0;

        while (layoutManager.running && !engine.isSettled && passes < 5000) {
            inner.updateManager.update(frameMs);
            passes++;
        }

        const steps = engine._stepCount;
        const x = engine.getNodePosition([...layoutManager.nodes][0])?.x ?? Number.NaN;
        release();
        release = undefined;
        cleanupTestGraph(graph);
        graph = undefined;

        return { passes, steps, x };
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

    // `minDelta` stops the layout once a round of steps moves no node that far. A slow frame runs
    // several rounds, so measuring over the whole frame would compare a bigger move and stop at a
    // different step -- one saved project would end in a different layout on a slower machine.
    for (const minDelta of [0.5, 1, 2]) {
        it(`stops at the same step and position at any frame rate with minDelta ${minDelta}`, async () => {
            const fast = await settle(1000 / 60, minDelta);
            const slow = await settle(200, minDelta);

            assert.equal(slow.steps, fast.steps, "the threshold must trip at the same step");
            assert.equal(slow.x, fast.x, "and leave the layout in the same place");
        });
    }
});
