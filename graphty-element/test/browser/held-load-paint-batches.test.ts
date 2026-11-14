/**
 * @file A batched load's node paint grows its batches from how fast the last batch went
 * (design/rendering/row-renderer.md, "Every feeder through the column door", fifth pull request).
 *
 * WHAT WENT WRONG. A frame's node batch is sized by the last batch's speed: rows painted a
 * millisecond times the budget. The speed counted only the rows that came back with a `Node`, and on
 * the `"batched"` path a row the batches draw comes back with none, so the speed was 0 and every
 * batch was the floor, a 32nd of the graph: a 100,000-node load took 32 frames, half of each idle.
 *
 * The test reads the speed the first batch left for the second, not the second batch's size: the
 * size is that speed times what is left of a 48 ms budget, so it falls back to the floor whenever
 * the first batch -- which also builds the batches' meshes -- takes longer than the budget, as it
 * did on a loaded CI runner. The speed is rows over time: above 0 once the rows are counted
 * however slow the machine, and 0 with the defect however fast.
 */

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { UpdateManager } from "../../src/managers/UpdateManager";
import { dispatcherOf } from "../../src/session/GraphSession";

const COUNT = 4096;
const FLOOR = COUNT / 32;

describe("a held batched load's node batches", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        graph.setRenderPath("batched");
        // Frames are pumped by hand at a stated 16 ms, so each one keeps to the frame budget. A layout
        // that reads node sizes would paint every row at once before reading them, so this one does not.
        graph.engine.stopRenderLoop();
        await graph.setLayout("random");
    });

    afterAll(() => {
        vi.restoreAllMocks();
        graph.dispose();
        container.remove();
    });

    it("are sized from the first batch's timed speed", async () => {
        const painter = graph.getStylePainter();
        const manager = (graph as unknown as { updateManager: UpdateManager }).updateManager;
        const speedOf = (): number => (manager as unknown as { nodePaintRate: number }).nodePaintRate;
        const limits: number[] = [];
        // the speed each batch starts from: the last batch's rows a millisecond
        const speeds: number[] = [];
        const takeNodes = painter.takeNodes.bind(painter);
        vi.spyOn(painter, "takeNodes").mockImplementation((limit?: number) => {
            limits.push(limit ?? Number.POSITIVE_INFINITY);
            speeds.push(speedOf());
            return takeNodes(limit);
        });

        await graph.getSession().data.importColumns({ nodeCount: COUNT, sources: [0], targets: [1] });
        await graph.waitForSettled();
        await operationQueueOf(graph).waitForCompletion();
        await dispatcherOf(graph.getSession()).lane.settled();

        let frames = 0;
        while (painter.hasPending && frames < COUNT) {
            manager.update(16);
            frames++;
        }
        assert.isFalse(painter.hasPending, "the whole repaint was applied");

        assert.isAtLeast(limits.length, 2, "the paint took more than one batch");
        assert.strictEqual(limits[0], FLOOR, "the first batch, untimed, is the floor");
        assert.isAbove(speeds[1], 0, "the second batch is sized by the first one's speed, which counted its rows");
    });
});
