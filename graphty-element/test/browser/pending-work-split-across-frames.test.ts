/**
 * @file Work split across frames is held in the record of pending work (issues #4218, #4219).
 *
 * graphty-element applies a repaint in batches within a frame budget and skips render ticks for
 * the GPU, so on a slow machine one change takes many frames. A wait for the final picture must
 * not resolve on a frame that shows half of it. The minimum-work test mode splits that work every
 * time -- one small paint batch per frame, every other tick skipped -- so these tests see the
 * interleaving a fast machine never shows, and prove the record holds it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { MINIMUM_PAINT_BATCH, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import type { UpdateManager } from "../../src/managers/UpdateManager";

const COUNT = 120;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

const BATCHES_REASON = "a style repaint is still being applied in batches";

describe("work split across frames, under the minimum-work test mode", () => {
    let container: HTMLElement;
    let graph: Graph;
    let updateManager: UpdateManager;

    beforeAll(async () => {
        setMinimumWorkPerFrame(true);
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular");
        await graph.waitForStableFrame();
        ({ updateManager } = graph as unknown as { updateManager: UpdateManager });
    });

    afterAll(() => {
        setMinimumWorkPerFrame(false);
        graph.dispose();
        container.remove();
    });

    it("holds a repaint's remaining batches as a token until the last is drawn", async () => {
        const painter = graph.getStylePainter();
        const { scene } = graph;
        /** Frames drawn while paint was still waiting to be applied, and what the record said then. */
        let splitFrames = 0;
        const reasons = new Set<string>();
        let stableWhilePending = 0;
        const observer = scene.onAfterRenderObservable.add(() => {
            if (painter.hasPending) {
                splitFrames++;
                reasons.add(updateManager.pending.firstPending()?.reason ?? "nothing");
                if (graph.isFrameStable) {
                    stableWhilePending++;
                }
            }
        });

        try {
            await graph.getSession().styles.add({
                name: "every node red",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            await graph.waitForStableFrame();
        } finally {
            scene.onAfterRenderObservable.remove(observer);
        }

        // One batch of MINIMUM_PAINT_BATCH nodes a frame: the repaint took many frames.
        assert.isAtLeast(splitFrames, Math.floor(COUNT / MINIMUM_PAINT_BATCH) - 1, "the repaint was split");
        assert.isTrue(reasons.has(BATCHES_REASON), `the record named the batches: ${[...reasons].join("; ")}`);
        assert.equal(stableWhilePending, 0, "no frame showing half the paint was called stable");
        assert.isFalse(painter.hasPending, "the wait resolved only once every batch was applied");
        assert.notEqual(updateManager.pending.firstPending("wait")?.reason, BATCHES_REASON);
    });

    it("waits for suggested styles held in the record before settling (issue #4219)", async () => {
        await graph.run("degree", {}, { style: false });
        await operationQueueOf(graph).waitForCompletion();
        const before = graph.getSession().styles.list().length;

        assert.isTrue(graph.applySuggestedStyles("degree"));
        assert.equal(
            updateManager.pending.firstPending("wait")?.kind,
            "style",
            "the suggestion is in the record before it lands",
        );
        await graph.waitForSettled();

        assert.isAbove(graph.getSession().styles.list().length, before, "the suggested layer is stacked");
        await graph.waitForStableFrame();
        assert.isFalse(graph.getStylePainter().hasPending, "and painted");
        assert.isNull(updateManager.pending.firstPending("wait"), "nothing is left in the record");
    });
});
