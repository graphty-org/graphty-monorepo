/**
 * @file A label placed at the center of its node is drawn in front of the node, from any side.
 *
 * THE DEFECT (issue #2323). A center label's plane sat at the node's own center, inside the node's
 * mesh, and a label sorts by depth with the scene: the node's near surface covered it, so the
 * words were resolved, kept and never seen. Center is the default label position of Graphviz,
 * Cytoscape and yEd, so every one of those files loaded with `styles: "file"` showed no labels.
 *
 * A SECOND DEFECT HID THE SAME LABELS: an outline. A node's outline is a highlight layer, which
 * paints the node's blurred silhouette wherever the stencil does not hold the node's own mark. The
 * label plane over the node wrote the ordinary mark there, so the outline was painted across the
 * words. Graphviz, Cytoscape and yEd all outline their nodes, so their center labels were black.
 *
 * WHAT IS MEASURED. One red node with a green-panelled label at its center. The pixels at the
 * node's projected center must be the label's green, not the node's red, from the default view,
 * from the opposite side of the node, and with a black outline around it.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many pixels either side of the node's projected center to read. */
const HALF = 3;

describe("a label at the center of its node", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes([{ id: "alpha", position: { x: 0, y: 0, z: 0 } }]);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "a centered label",
            selector: { match: "ids", nodes: ["alpha"] },
            set: {
                "node.color": "#FF0000",
                "node.size": 2,
                "node.label": "W",
                "node.labelStyle": { sizePx: 24, background: "#10B981", color: "#10B981", location: "center" },
            },
        });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Count the green and red pixels in a small square at the node's projected center.
     * @returns The two counts.
     */
    async function colorsAtCenter(): Promise<{ green: number; red: number }> {
        await graph.waitForStableFrame();
        await graph.scene.whenReadyAsync();
        graph.scene.render();

        const { engine } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera, "a graph that has rendered has an active camera");
        const at = Vector3.Project(
            Vector3.Zero(),
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );
        const cx = Math.round(at.x);
        const cy = Math.round(height - at.y);

        let green = 0;
        let red = 0;
        for (let y = cy - HALF; y <= cy + HALF; y++) {
            for (let x = cx - HALF; x <= cx + HALF; x++) {
                const i = (y * width + x) * 4;
                if (pixels[i + 1] > 120 && pixels[i] < 90) {
                    green++;
                } else if (pixels[i] > 150 && pixels[i + 1] < 90) {
                    red++;
                }
            }
        }

        return { green, red };
    }

    it("is drawn in front of the node from the default view", async () => {
        const { green, red } = await colorsAtCenter();
        assert.isAbove(green, 0, `the node's center shows ${String(red)} red pixels and no label`);
    });

    it("is drawn over an outlined node, not under the outline", async () => {
        await graph.getSession().styles.add({
            name: "a black outline",
            selector: { match: "ids", nodes: ["alpha"] },
            set: { "node.outline": "#000000" },
        });
        const { green, red } = await colorsAtCenter();
        assert.isAbove(green, 0, `the node's center shows ${String(red)} red pixels and no label`);
    });

    it("is drawn in front of the node from the opposite side", async () => {
        await graph.setCameraState({ position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } });
        const { green, red } = await colorsAtCenter();
        assert.isAbove(green, 0, `the node's center shows ${String(red)} red pixels and no label`);
    });
});
