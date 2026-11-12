/**
 * @file A batched load's node paint grows its batches from how fast the last batch went
 * (design/rendering/row-renderer.md, "Every feeder through the column door", fifth pull request).
 *
 * WHAT WENT WRONG. A frame's node batch is sized by the last batch's speed: rows painted a
 * millisecond times the budget. The speed counted only the rows that came back with a `Node`, and on
 * the `"batched"` path a row the batches draw comes back with none, so the speed was 0 and every
 * batch was the floor, a 32nd of the graph: a 100,000-node load took 32 frames, half of each idle.
 *
 * The count decides the second batch, not this machine's speed: with the speed counted, the second
 * batch is the floor (128 rows) only if 128 rows took longer than a whole 48 ms budget, a hundred
 * times slower than any machine paints them; with the defect it is the floor every time.
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

    it("grow past the floor once the first batch has been timed", async () => {
        const painter = graph.getStylePainter();
        const limits: number[] = [];
        const takeNodes = painter.takeNodes.bind(painter);
        vi.spyOn(painter, "takeNodes").mockImplementation((limit?: number) => {
            limits.push(limit ?? Number.POSITIVE_INFINITY);
            return takeNodes(limit);
        });

        await graph.getSession().data.importColumns({ nodeCount: COUNT, sources: [0], targets: [1] });
        await graph.waitForSettled();
        await operationQueueOf(graph).waitForCompletion();
        await dispatcherOf(graph.getSession()).lane.settled();

        const manager = (graph as unknown as { updateManager: UpdateManager }).updateManager;
        let frames = 0;
        while (painter.hasPending && frames < COUNT) {
            manager.update(16);
            frames++;
        }
        assert.isFalse(painter.hasPending, "the whole repaint was applied");

        assert.isAtLeast(limits.length, 2, "the paint took more than one batch");
        assert.strictEqual(limits[0], FLOOR, "the first batch, untimed, is the floor");
        assert.isAbove(limits[1], FLOOR, "the second batch is sized by the first one's speed");
        assert.isAtMost(limits.length, 3, "the load is painted in a few frames, not 32");
    });
});
