/**
 * @file An edge repaint spread over many frames places only the edges each frame painted, and walks
 * every edge once, on the frame that empties the queue (design/ui/studio/tier5/ws-polish-3-scale.md).
 *
 * WHAT WENT WRONG. Each frame of a repaint forced the walk of every edge, so a repaint of 200,000
 * edges in batches of 1,024 walked all 200,000 about 200 times: 7.6 s of a 13.7 s profile on a
 * 50,000-node graph. The minimum-work test mode splits the repaint into many frames, so the walk
 * count shows: with the walk forced on each frame it grows with frames times edges.
 */

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import { MINIMUM_PAINT_BATCH, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";

const COUNT = 120;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

describe("an edge repaint split across frames", () => {
    let container: HTMLElement;
    let graph: Graph;

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
    });

    afterAll(() => {
        vi.restoreAllMocks();
        setMinimumWorkPerFrame(false);
        graph.dispose();
        container.remove();
    });

    it("updates each painted edge with its batch and walks every edge once at the end", async () => {
        const painter = graph.getStylePainter();
        let splitFrames = 0;
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            if (painter.hasPendingEdges) {
                splitFrames++;
            }
        });
        const update = vi.spyOn(Edge.prototype, "update");

        try {
            await graph.getSession().styles.add({
                name: "every edge red",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.color": "#ff0000" },
            });
            await graph.waitForStableFrame();
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
        }

        assert.isAtLeast(splitFrames, Math.floor(EDGES.length / MINIMUM_PAINT_BATCH) - 1, "the repaint was split");
        // Each edge once with its batch, all of them once at the end, and a frame or two of slack:
        // a walk on every split frame would be splitFrames times the edges.
        assert.isBelow(update.mock.calls.length, EDGES.length * 4, `edge updates: ${String(update.mock.calls.length)}`);
        assert.isFalse(painter.hasPending, "every batch was applied");
    });

    it("waitForPainted resolves only once the canvas has the last batch, where styles.settled() does not wait", async () => {
        const painter = graph.getStylePainter();
        await graph.getSession().styles.add({
            name: "every edge blue",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#0000ff" },
        });
        await graph.getSession().styles.settled();
        const owedAtSettled = painter.hasPending;
        await graph.waitForPainted();

        assert.isTrue(owedAtSettled, "split into frames, the paint was still owed when styles.settled() resolved");
        assert.isFalse(painter.hasPending, "waitForPainted waited for the last batch");
    });
});
