import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import type { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
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
        layout: "ngraph" | "forceatlas2" = "ngraph",
        msPerClockRead = 0,
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
        await graph.setLayout(layout, layout === "forceatlas2" ? { seed: 7, maxIter: 300 } : {});

        const layoutManager = graph.getLayoutManager();
        const engine = layoutManager.layoutEngine as NGraphEngine | SimulationLayoutEngine;
        let passes = 0;

        // The catch-up loop also stops a frame's rounds once REAL time passes half the frame, a
        // guard for real users. Here the frame time is stated, so the real clock is held still while
        // frames are pumped; otherwise a slow runner cuts frames short and the pass count measures
        // the machine (issue #2261).
        // A test of the per-frame budget moves it on by a fixed amount at every read instead, so
        // stepping "costs" time without the test depending on how fast the machine is.
        let clockAt = performance.now();
        const clock = vi.spyOn(performance, "now").mockImplementation(() => (clockAt += msPerClockRead));
        try {
            while (layoutManager.running && !engine.isSettled && passes < 5000) {
                inner.updateManager.update(frameMs);
                passes++;
            }
        } finally {
            clock.mockRestore();
        }

        const steps = "_stepCount" in engine ? engine._stepCount : engine.iterationsDone;
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

    // ForceAtlas2 is a simulation: the frame loop hands it one BATCH a frame rather than calling
    // `step()` per iteration. On the CPU that batch must keep the same pace, or a 100-iteration
    // layout drawn at six frames a second takes 17 s to settle (issue #2204).
    it("paces a CPU simulation layout by time too", async () => {
        const fast = await settle(1000 / 60, 0, "forceatlas2");
        const slow = await settle(200, 0, "forceatlas2");

        assert.isAbove(fast.steps, 60, "the test graph must need many iterations to settle");
        assert.equal(fast.passes, fast.steps, "at 60 frames a second the layout runs one iteration a frame");
        assert.equal(slow.steps, fast.steps, "the pace changes when iterations run, never where the layout ends");
        assert.equal(slow.x, fast.x, "and leaves the layout in the same place");
        assert.isAtMost(slow.passes, Math.ceil(fast.steps / 12) + 1, `settled in ${slow.passes} passes of 200 ms`);
    });

    // On a slow CPU a 1 s frame owed 12 rounds and could spend half of itself on them, which kept
    // the next frame at 1 s: an iPad drew a frame a second while a 3,000 node layout settled. A
    // frame now stops taking rounds once they would pass an absolute budget, whatever it owes.
    it("takes no more catch-up rounds than the frame budget allows, and still ends in the same place", async () => {
        const fast = await settle(1000 / 60);
        // Every clock read 30 ms later: one round "costs" at least 30 ms, so a second would pass
        // the budget. Without it the 1 s frames would each take several rounds.
        const slow = await settle(1000, 0, "ngraph", 30);

        assert.equal(slow.passes, slow.steps, "one round, one step, per frame once a round fills the budget");
        assert.equal(
            slow.steps,
            fast.steps,
            "deferring rounds changes when steps are taken, never where the layout ends",
        );
        assert.equal(slow.x, fast.x, "and leaves the layout in the same place");
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
