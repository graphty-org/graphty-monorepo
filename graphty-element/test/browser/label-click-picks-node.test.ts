/**
 * @file A click on a node's drawn label. By default the label plane takes the pick and answers no
 * node, so the click selects nothing; with `labelStyle.pickable` the click and `elementAt` both
 * answer the node the label belongs to. Clicks are real mouse input (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, nextFrame, type Point } from "../helpers/real-input";

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
 * @param count - How many.
 */
async function frames(count = 3): Promise<void> {
    for (let i = 0; i < count; i++) {
        await nextFrame();
    }
}

describe("a click on a node's label", () => {
    it("selects nothing by default: the label takes the pick and answers no node", async () => {
        const element = await mounted(undefined);
        const point = labelCenter(element, "b");

        // Established, not assumed: the plane is pickable today and wins the pick there.
        const picked = element.graph.scene.pick(point.x, point.y).pickedMesh;
        assert.strictEqual(picked, element.graph.getNode("b")?.label?.labelMesh, "the label plane takes the pick");
        assert.isNull(element.elementAt(point), "elementAt on the label answers nothing");

        await click(element, point);
        await frames();
        assert.isNull(element.getSelectedNode(), "the click on the label selected nothing");
    });

    it("selects the node it labels when the label style sets pickable", async () => {
        const element = await mounted(true);
        const point = labelCenter(element, "b");

        assert.deepEqual(element.elementAt(point), { kind: "node", id: "b" }, "elementAt answers the labeled node");

        await click(element, point);
        await frames();
        assert.strictEqual(element.getSelectedNode()?.id, "b", "the click on the label selected its node");

        // The sphere itself still picks its node.
        const sphere = element.nodeScreenPosition("a");
        assert.isDefined(sphere);
        await click(element, { x: sphere.x, y: sphere.y });
        await frames();
        assert.strictEqual(element.getSelectedNode()?.id, "a", "a click on the sphere still selects its node");
    });

    it("selects nothing when pickable is written false", async () => {
        const element = await mounted(false);
        const point = labelCenter(element, "b");
        assert.isNull(element.elementAt(point));
        await click(element, point);
        await frames();
        assert.isNull(element.getSelectedNode());
    });
});
