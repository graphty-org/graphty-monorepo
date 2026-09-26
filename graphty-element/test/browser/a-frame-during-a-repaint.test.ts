/**
 * @file A frame drawn while a style pass is part way through does not keep the half-painted look.
 *
 * WHAT WENT WRONG (issue #440). A style pass yields to the event loop between slices, and until it
 * announces what it painted, the style columns it is rewriting and the mesh keys it has not
 * interned yet disagree. A frame that drained the renderer's pending set in that window handed an
 * element the key from before the pass and a style from the middle of it -- a whole-graph pass
 * clears an element's columns first, so the middle of it is the element's own defaults. The edge
 * built its mesh from that pair, and when the pass announced, the key was unchanged, so the edge
 * rebuilt nothing and kept the defaults for good. On CI, where coverage makes a pass slow enough to
 * yield, story tests read an arrow cap at full opacity that a layer had asked for at half, and
 * nodes drawn in another node's shape.
 *
 * HOW THE TEST FORCES THAT ORDER. The render loop is stopped so the test draws the frames itself.
 * A layer is added and its paint left pending, as it is when no frame has come due since it
 * announced. Then a whole-graph pass is started with the clock stubbed so that every slice yields,
 * and the renderer is run at the yield where the edge has been cleared and not yet repainted --
 * which is the ordering a slow CI runner reaches by chance.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** How long the element may take to build its renderer. */
const MOUNT_TIMEOUT_MS = 15000;

/** Mounting and loading is slower than the five-second default. */
const TEST_TIMEOUT_MS = 30000;

/** Where the element is mounted, kept so the test can take it down again. */
let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` and wait until its graph is live.
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

    const deadline = Date.now() + MOUNT_TIMEOUT_MS;

    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

/**
 * How see-through each arrow cap in the scene is drawn: `EdgeMesh.createArrowHead` writes the
 * cap's opacity onto the mesh as its visibility.
 * @param element - The element.
 * @returns One visibility per arrow mesh.
 */
function arrowCapOpacities(element: Graphty): number[] {
    return element.graph.scene.meshes.filter((mesh) => mesh.name.includes("arrow")).map((mesh) => mesh.visibility);
}

describe("a frame drawn while a style pass is painting", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        container?.remove();
        container = null;
    });

    it(
        "leaves the element to be drawn from what the pass announces",
        async () => {
            const element = await mount();

            element.layout = "fixed";
            element.nodeData = [
                { id: "a", position: { x: -2, y: 0, z: 0 } },
                { id: "b", position: { x: 2, y: 0, z: 0 } },
            ];
            element.edgeData = [{ src: "a", dst: "b" }];

            await element.waitForStableFrame();

            const { graph, session } = element;
            // The frame's own style step, driven by hand so the test chooses when a frame lands.
            const frame = (graph as unknown as { updateManager: { syncStyles: () => void } }).updateManager;
            const painter = graph.getStylePainter();

            graph.engine.stopRenderLoop();

            // Painted and announced, and left pending: no frame has drawn it yet.
            await session.styles.add({
                name: "Half-opacity caps",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.arrowHead": "normal", "edge.arrowHeadOpacity": 0.5 },
            });

            assert.isTrue(painter.hasPending, "the layer's paint is waiting for a frame");

            // Every slice of the next pass runs out of time, so the pass yields after each one.
            let clock = performance.now();
            vi.spyOn(performance, "now").mockImplementation(() => (clock += 1000));

            // A data change repaints the whole graph from the bottom of the stack, which is the
            // pass that clears an element's columns before painting them again.
            const update = graph.updateNodes([{ id: "a", touched: true }]);
            let finished = false;
            void update.then(() => {
                finished = true;
            });

            // The frame lands at the one moment that matters: the pass has cleared the edge and
            // repainted it from the element's own layers, and not yet reached the layer that fades
            // its cap. Earlier, the frame takes the pending paint while the columns still hold the
            // last pass's answer, and nothing goes wrong.
            let framesMidPass = 0;

            while (!finished) {
                await new Promise((resolve) => setTimeout(resolve, 0));
                if (painter.isPainting && painter.edgePaint(0)?.style.arrowHead?.opacity !== 0.5) {
                    framesMidPass++;
                    frame.syncStyles();
                }
            }

            vi.restoreAllMocks();
            await update;
            frame.syncStyles();

            assert.isAbove(framesMidPass, 0, "a frame came due while the pass was painting");
            assert.deepStrictEqual(
                arrowCapOpacities(element).map((value) => value.toFixed(2)),
                ["0.50"],
                "the cap is asked for at half opacity",
            );
        },
        TEST_TIMEOUT_MS,
    );
});
