/**
 * @file The tooltip a layer asks for, drawn when the pointer is over the node.
 *
 * `node.tooltip` is published in the channel table as `renderable: true`, it is sold in
 * `docs/guide/styling.md` as "the words to show on hover", and the painter resolves it into
 * `tooltip.text` with `tooltip.enabled` switched on. Nothing then drew it. `Node` built a label
 * and never a tooltip, so the words were resolved, stored, reported by `styles.explain()` and
 * never reached a frame -- in this version of the package or any earlier one.
 *
 * The existing coverage is why it survived: the file that used to be at
 * `test/browser/Edge.tooltip.test.ts` constructed a `RichTextLabel` by hand and asserted the
 * object it had just built, which is true of the label renderer and says nothing about whether
 * an edge or a node ever asks for one.
 *
 * THE EDGE HALF WENT THE OTHER WAY. 2.0 withdrew `edge.tooltip` rather than building it: an edge
 * cannot be hovered, so there is no moment at which one could appear.
 * `test/browser/an-edge-tooltip-is-withdrawn.test.ts` pins that.
 *
 * This file drives the real pointer. It moves the mouse onto a node and off it again, and asks
 * the scene what is drawn. What a tooltip LOOKS like -- the channel that carries its typeface,
 * its panel and its colours -- is read in `test/browser/node-tooltip-style-draws.test.ts`.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";

/** Two nodes far enough apart that a pointer over one is nowhere near the other. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge between them. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many frames to render before reading anything back. */
const FRAMES = 20;

/** How long to leave between frames so the work a frame started can land. */
const FRAME_MS = 10;

/** A layer that gives one node a tooltip and says nothing else. */
const TOOLTIP_LAYER: LayerSpec = {
    name: "one node's tooltip",
    selector: { match: "ids", nodes: ["alpha"] },
    set: { "node.tooltip": "the busiest node" },
};

describe("a tooltip a layer asks for", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular");
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render a few frames so a texture upload and a shader compile can land.
     */
    async function settle(): Promise<void> {
        for (let frame = 0; frame < FRAMES; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }
    }

    /**
     * Where a node is drawn, in canvas pixels counting from the top.
     * @param node - the node to locate
     * @returns the pixel column and row
     */
    function screenPosition(node: Node): { x: number; y: number } {
        const { engine } = graph;
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera, "a graph that has rendered has an active camera");

        const point = Vector3.Project(
            node.mesh.absolutePosition,
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
        );

        return { x: Math.round(point.x), y: Math.round(point.y) };
    }

    /**
     * Move the real pointer to a place on the canvas and let the scene react.
     * @param at - where to move it, in canvas pixels
     */
    async function pointerTo(at: { x: number; y: number }): Promise<void> {
        const { canvas } = graph;
        const box = canvas.getBoundingClientRect();

        canvas.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: box.left + at.x,
                clientY: box.top + at.y,
                bubbles: true,
                pointerId: 1,
                pointerType: "mouse",
                // A real pointermove carries no button. A PointerEvent built by hand defaults to
                // 0, which is the LEFT button, and Babylon's input manager reads that as a press
                // -- so a hand-built move starts a drag, and a node that is being dragged stops
                // reporting hover. Without this the second move in a test never reaches the
                // hover handler at all.
                button: -1,
            }),
        );

        await settle();
    }

    /**
     * The name of the mesh a node's tooltip is drawn on, or null when it has none.
     *
     * A name rather than the object, because an assertion that fails on a `RichTextLabel` asks
     * the test reporter to print a Babylon mesh, a material and a scene -- which it cannot, and
     * the run dies formatting the failure instead of reporting it.
     * @param node - the node to look at
     * @returns the mesh name, or null
     */
    function tooltipMesh(node: Node): string | null {
        return node.tooltip?.labelMesh?.name ?? null;
    }

    /**
     * The node under test.
     * @returns the node the tooltip layer selects
     */
    function alpha(): Node {
        const node = graph.getNode("alpha");
        assert.isDefined(node, "the fixture has the node the layer names");

        return node;
    }

    it("is not drawn before the pointer is anywhere near the node", async () => {
        await graph.getSession().styles.add(TOOLTIP_LAYER);
        await settle();

        assert.isNull(tooltipMesh(alpha()), "a tooltip is hover-only, so nothing is drawn yet");
    });

    it("is drawn when the pointer moves onto the node", async () => {
        await graph.getSession().styles.add(TOOLTIP_LAYER);
        await settle();

        const node = alpha();
        await pointerTo(screenPosition(node));

        assert.isNotNull(tooltipMesh(node), "hovering the node drew its tooltip");
        assert.isFalse(node.tooltip?.labelMesh?.isDisposed(), "and the mesh is live");
    });

    it("says what the layer wrote", async () => {
        await graph.getSession().styles.add(TOOLTIP_LAYER);
        await settle();

        const node = alpha();
        await pointerTo(screenPosition(node));

        assert.strictEqual(node.tooltipText, "the busiest node");
    });

    it("goes away when the pointer leaves", async () => {
        await graph.getSession().styles.add(TOOLTIP_LAYER);
        await settle();

        const node = alpha();
        await pointerTo(screenPosition(node));
        assert.isNotNull(tooltipMesh(node), "the tooltip was drawn, so its removal means something");

        await pointerTo({ x: 2, y: 2 });

        assert.isNull(tooltipMesh(node), "the pointer left and the tooltip went with it");
    });

    it("is not drawn on a node no layer gave one", async () => {
        await graph.getSession().styles.add(TOOLTIP_LAYER);
        await settle();

        const other = graph.getNode("omega");
        assert.isDefined(other);
        await pointerTo(screenPosition(other));

        assert.isNull(tooltipMesh(other), "the layer named one node, so only that node has one");
    });
});
