/**
 * @file Turning labels on for a large graph builds them over many frames, not in one.
 *
 * WHAT WENT WRONG. A frame's node batch is sized from how fast the last batch painted. After a color pass, which
 * paints a node in microseconds, that speed said every node fits in the frame, and the batch then built a label for
 * each of them (about half a millisecond each): 10,000 labels in one 7 s task, with the page frozen and no frame
 * drawn until it ended. A batch that rebuilds no mesh now looks at the clock as it goes and leaves the rest for the
 * next frame once it has painted a REPAINT_FRAMES-th of the graph.
 *
 * Counted, not timed: the labels each frame adds. Before the fix one frame added all of them.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

const COUNT = 10_000;
const SIDE = Math.ceil(Math.sqrt(COUNT));
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({
    id: `n${String(index)}`,
    position: { x: (index % SIDE) * 2, y: Math.floor(index / SIDE) * 2, z: 0 },
}));

/**
 * The most labels one frame may add: far below every node, and well above a REPAINT_FRAMES-th of them plus what a
 * slow software-rendered frame's budget fits.
 */
const MOST_PER_FRAME = COUNT / 4;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

// The "objects" path: under "batched" a row's label is built when the batch's row builds end, out of the clock's sight.
describe("turning labels on for nodes drawn as objects", () => {
    it("builds the labels over several frames after a cheap color pass", async () => {
        const container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        const graph = new Graph(container);
        cleanups.push(() => {
            graph.dispose();
            container.remove();
        });
        await graph.init();
        graph.setRenderPath("objects");
        await graph.addNodes(NODES);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.waitForStableFrame();

        // A cheap repaint first: its speed is what sized the label build's batch.
        const { styles } = graph.getSession();
        await styles.add({
            name: "every node red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await graph.waitForPainted();

        const labeled = (): number => graph.getNodes().filter((node) => node.label !== undefined).length;
        const perFrame: number[] = [];
        let before = labeled();
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            const now = labeled();
            if (now > before) {
                perFrame.push(now - before);
            }

            before = now;
        });

        try {
            await styles.add({
                name: "labels",
                target: "node",
                selector: { match: "everything" },
                set: { "node.label": "label" },
            });
            await graph.waitForPainted();
            await graph.waitForStableFrame();
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
        }

        assert.strictEqual(labeled(), COUNT, "every node has its label in the end");
        assert.isAtMost(Math.max(...perFrame), MOST_PER_FRAME, `labels added per frame: ${JSON.stringify(perFrame)}`);
    });
});
