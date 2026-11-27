/**
 * @file A click on a node's drawn label. By default the label lets the pointer through to what is
 * drawn under it: a label beside its node passes the click to the background, and a label drawn
 * over its node passes it to that node, never to an edge ending under it. With
 * `labelStyle.pickable` the click and `elementAt` both answer the node the label belongs to. Clicks
 * and moves are real mouse input (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, hover, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Two labeled nodes at fixed places, drawn.
 * @param pickable - The label style's `pickable`, or undefined to leave it unset.
 * @returns The element.
 */
async function mounted(pickable: boolean | undefined): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "names",
        selector: { match: "everything" },
        set: {
            "node.label": "A long name",
            "node.labelStyle": { sizePx: 96, ...(pickable === undefined ? {} : { pickable }) },
        },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node's label is drawn, off its sphere: the label's center.
 * @param element - The element.
 * @param id - The node.
 * @returns The point, in CSS pixels from the element's top-left corner.
 */
function labelCenter(element: Graphty, id: string): Point {
    const mesh = element.graph.getNode(id)?.label?.labelMesh;
    assert.isOk(mesh, `node ${id} draws a label`);
    const point = element.worldToScreen(mesh.getAbsolutePosition());
    assert.isTrue(point.x > 0 && point.x < WIDTH && point.y > 0 && point.y < HEIGHT, "the label is on screen");
    return point;
}

/**
 * Let a few frames draw.
 * @param element - The element.
 * @param count - How many.
 */
async function frames(element: Graphty, count = 3): Promise<void> {
    await drawnFrames(element.graph.getScene(), count);
}

describe("a click on a node's label", () => {
    it("lets the click through to the background by default", async () => {
        const element = await mounted(undefined);
        const point = labelCenter(element, "b");

        const picked = element.graph.scene.pick(point.x, point.y).pickedMesh;
        assert.notStrictEqual(
            picked,
            element.graph.getNode("b")?.label?.labelMesh,
            "the label plane does not take the pick",
        );
        assert.isNull(element.elementAt(point), "elementAt on the label answers what is under it: nothing");

        await click(element, point);
        await frames(element);
        assert.isNull(element.getSelectedNode(), "the click on the label selected nothing");
    });

    it("selects the node it labels when the label style sets pickable", async () => {
        const element = await mounted(true);
        const point = labelCenter(element, "b");

        assert.deepEqual(element.elementAt(point), { kind: "node", id: "b" }, "elementAt answers the labeled node");

        await click(element, point);
        await frames(element);
        assert.strictEqual(element.getSelectedNode()?.id, "b", "the click on the label selected its node");

        // The sphere itself still picks its node.
        const sphere = element.nodeScreenPosition("a");
        assert.isDefined(sphere);
        await click(element, { x: sphere.x, y: sphere.y });
        await frames(element);
        assert.strictEqual(element.getSelectedNode()?.id, "a", "a click on the sphere still selects its node");
    });

    it("selects nothing when pickable is written false", async () => {
        const element = await mounted(false);
        const point = labelCenter(element, "b");
        assert.isNull(element.elementAt(point));
        await click(element, point);
        await frames(element);
        assert.isNull(element.getSelectedNode());
    });
});

describe("a label drawn over its own node", () => {
    /**
     * Node a wears a wide centered label that covers its middle and the start of the one edge.
     * @returns The element.
     */
    async function overNode(): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([
            { id: "a", position: { x: -4, y: 0, z: 0 } },
            { id: "b", position: { x: 4, y: 0, z: 0 } },
        ]);
        await element.session.data.addEdges([{ src: "a", dst: "b" }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.setViewMode("2d");
        await element.session.styles.add({
            name: "name inside a",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.label": "GNA1 wide", "node.labelStyle": { location: "center", sizePx: 40 } },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        return element;
    }

    it("gives the click and the hover at the node's middle to the node, not the edge under the label", async () => {
        const element = await overNode();
        const center = element.nodeScreenPosition("a");
        assert.isDefined(center);
        const point = { x: center.x, y: center.y };
        const label = element.graph.getNode("a")?.label?.labelMesh;
        assert.isOk(label, "a draws its label");

        assert.deepEqual(element.elementAt(point), { kind: "node", id: "a" }, "elementAt answers the node");

        await hover(element, point);
        await frames(element);
        assert.strictEqual(element.session.selection.hovered, "a", "the node under its label is hovered");

        await click(element, point);
        await frames(element);
        assert.deepEqual([...element.session.selection.nodes], ["a"], "the click selected the node");
        assert.deepEqual([...element.session.selection.edges], [], "and no edge");
    });
});
