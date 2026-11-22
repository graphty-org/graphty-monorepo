/**
 * @file A `Node` painted by `UpdateManager.repaintNodes` or rebuilt by `Node.updateStyle` while a
 * style pass is part way through does not keep the half-painted look (issue #9442).
 *
 * WHAT WENT WRONG. Both read the node's paint from the painter at once. Read while a style pass
 * was still painting, that paint pairs the mesh key from before the pass with a style from the
 * middle of it: the layers below already repainted, the layers above not yet. The `Node` built its
 * mesh from that pair, and when the pass announced, the key was unchanged, so the frame that drew
 * the real paint kept the mesh it had: the defect of issues #440 and #9414 through two more doors.
 *
 * HOW THE TEST FORCES THAT ORDER. As `a-row-built-during-a-repaint.test.ts` does: the render loop
 * is stopped, so no frame paints the nodes, and a whole-graph pass is started with the clock
 * stubbed so every slice yields. The reader runs at the yield where the bottom layer has painted
 * the nodes and the top one has not. On the `"batched"` path the rows get their `Node`s at that
 * yield too, so the `Node`s have never been painted when the reader runs.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { Graphty } from "../../src/graphty-element";
import { dataManagerInternals } from "../../src/managers/DataManager";

/** Where the element is mounted, kept so the test can take it down again. */
let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` on a render path and wait until its graph is live.
 * @param path - The render path.
 * @returns The mounted element.
 */
async function mount(path: "objects" | "batched"): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");
    assert.instanceOf(mounted, Graphty, "importing the package is what defines the custom element");
    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    await vi.waitFor(() => {
        assert.isTrue(mounted.graph.initialized, "the element finished initialising");
    });
    await operationQueueOf(mounted.graph).waitForCompletion();
    mounted.graph.setRenderPath(path);

    return mounted;
}

const NODES = ["a", "b", "c"].map((id, at) => ({ id, position: { x: at * 3, y: 0, z: 0 } }));

/** The two readers, each run on every node at the yield between the pass's two layers. */
const READERS = {
    repaintNodes: (element: Graphty): void => {
        element.graph.getUpdateManager().repaintNodes(element.graph.getNodes());
    },
    updateStyle: (element: Graphty): void => {
        for (const node of element.graph.getNodes()) {
            node.updateStyle();
        }
    },
} as const;

describe.each(["objects", "batched"] as const)("on the %s render path", (path) => {
    afterEach(() => {
        vi.restoreAllMocks();
        container?.remove();
        container = null;
    });

    it.each(Object.keys(READERS) as (keyof typeof READERS)[])(
        "a node %s paints while a style pass is painting is drawn from what the pass announces",
        async (reader) => {
            const element = await mount(path);
            const { graph, session } = element;
            const painter = graph.getStylePainter();
            const manager = graph.getDataManager();

            await graph.setLayout("fixed");
            await session.styles.add({
                name: "Defaults",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shape": "box" },
            });
            await session.styles.add({
                name: "Values",
                target: "node",
                selector: { match: "everything" },
                // A channel that keys no mesh, so the node's paint is built for the node and not shared by its look.
                set: { "node.shape": "sphere", "node.labelColor": "#ff0000" },
            });

            // No frame from here on: the nodes are painted by the load's pass and never drawn.
            graph.engine.stopRenderLoop();
            await session.data.addNodes(NODES);
            await operationQueueOf(graph).waitForCompletion();
            assert.strictEqual(
                dataManagerInternals.nodesBuilt(manager),
                path === "batched" ? 0 : NODES.length,
                "the batched path stores every row with no Node",
            );
            assert.strictEqual(painter.nodePaint(0)?.style.shape?.type, "sphere", "the load's pass painted the nodes");

            // Every slice of the next pass runs out of time, so the pass yields after each one.
            let clock = performance.now();
            vi.spyOn(performance, "now").mockImplementation(() => (clock += 1000));

            // A data change repaints the whole graph from the bottom of the stack.
            const update = graph.updateNodes([{ id: "a", touched: true }]);
            let finished = false;
            void update.then(() => {
                finished = true;
            });

            let readMidPass = false;
            while (!finished) {
                await new Promise((resolve) => setTimeout(resolve, 0));
                if (!readMidPass && painter.isPainting && painter.nodePaint(0)?.style.shape?.type !== "sphere") {
                    readMidPass = true;
                    READERS[reader](element);
                }
            }

            vi.restoreAllMocks();
            await update;
            graph.getUpdateManager().syncStyles();

            assert.isTrue(readMidPass, "the reader ran between the pass's two layers");
            assert.deepStrictEqual(
                graph.getNodes().map((node) => node.shapeType),
                ["sphere", "sphere", "sphere"],
                "every node is drawn as the top layer asks",
            );
        },
    );
});
