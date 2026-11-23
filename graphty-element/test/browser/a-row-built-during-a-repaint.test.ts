/**
 * @file A `Node` built for a row drawn with no `Node` while a style pass is part way through does
 * not keep the half-painted look (issue #9414).
 *
 * WHAT WENT WRONG. On the `"batched"` render path a row gets its `Node` only when something asks for
 * it -- a group box measuring its members, `getNodes`, framing -- and the new `Node` is painted at
 * once from its row's paint. Asked while a style pass was still painting, that paint pairs the mesh
 * key from before the pass with a style from the middle of it: the layers below already repainted,
 * the layers above not yet. The `Node` built its mesh from that pair, and when the pass announced,
 * the key was unchanged, so the frame that drew the row's real paint kept the mesh it had. The same
 * defect as issue #440, through the door `UpdateManager.syncStyles` already closed for frames. On
 * CI the members of two expanded groups in the fidelity scorecard were drawn with a file's
 * "Defaults" layer and without its "Values" layer.
 *
 * HOW THE TEST FORCES THAT ORDER. The render loop is stopped, so no frame draws the rows and they
 * stay drawn with no `Node` and no look of their own. A whole-graph pass is started with the clock
 * stubbed so every slice yields, and the rows are built at the yield where the bottom layer has
 * painted them and the top one has not.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { Graphty } from "../../src/graphty-element";
import { dataManagerInternals } from "../../src/managers/DataManager";

/** Where the element is mounted, kept so the test can take it down again. */
let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` on the batched render path and wait until its graph is live.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
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
    mounted.graph.setRenderPath("batched");

    return mounted;
}

const NODES = ["a", "b", "c"].map((id, at) => ({ id, position: { x: at * 3, y: 0, z: 0 } }));

describe("a row built while a style pass is painting", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        container?.remove();
        container = null;
    });

    it("is drawn from what the pass announces", async () => {
        const element = await mount();
        const { graph, session } = element;
        const painter = graph.getStylePainter();
        const manager = graph.getDataManager();

        await graph.setLayout("fixed");
        const defaults = await session.styles.add({
            name: "Defaults",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await session.styles.add({
            name: "Values",
            target: "node",
            selector: { match: "everything" },
            // A channel that keys no mesh, so the row's paint is built for the row and not shared by its look.
            set: { "node.shape": "sphere", "node.labelColor": "#ff0000" },
        });

        // No frame from here on: the rows are stored, painted and never drawn.
        graph.engine.stopRenderLoop();
        await session.data.addNodes(NODES);
        await operationQueueOf(graph).waitForCompletion();
        assert.strictEqual(dataManagerInternals.nodesBuilt(manager), 0, "every row is stored with no Node");
        assert.strictEqual(painter.nodePaint(0)?.style.shape?.type, "sphere", "the load's pass painted the rows");

        // Every slice of the next pass runs out of time, so the pass yields after each one.
        let clock = performance.now();
        vi.spyOn(performance, "now").mockImplementation(() => (clock += 1000));

        // Changing the bottom layer repaints the whole graph from the bottom of the stack. A data
        // change no longer does: it repaints only the rows it touched, at once (issue #9164).
        const update = session.styles
            .update(defaults.id, { set: { "node.shape": "box", "node.labelColor": "#00ff00" } })
            .then(async () => session.styles.settled());
        let finished = false;
        void update.then(() => {
            finished = true;
        });

        let builtMidPass = false;
        while (!finished) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (!builtMidPass && painter.isPainting && painter.nodePaint(0)?.style.shape?.type !== "sphere") {
                builtMidPass = true;
                dataManagerInternals.buildAll(manager);
            }
        }

        vi.restoreAllMocks();
        await update;
        graph.getUpdateManager().syncStyles();

        assert.isTrue(builtMidPass, "the rows were built between the pass's two layers");
        assert.deepStrictEqual(
            graph.getNodes().map((node) => node.shapeType),
            ["sphere", "sphere", "sphere"],
            "every node is drawn as the top layer asks",
        );
    });
});
