/**
 * @file A flat node shape, thin in 2D, wide or bordered, is picked by a real click like any node
 * (issues #2318, #2316, #2317).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Two nodes drawn as flat shapes: a wide bordered rectangle and a diamond.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await element.session.styles.add({
        name: "wide",
        target: "node",
        selector: { match: "ids", nodes: ["wide"] },
        set: { "node.shape": "rectangle", "node.width": 4, "node.height": 1, "node.borderWidth": 0.2 },
    });
    await element.session.styles.add({
        name: "diamond",
        target: "node",
        selector: { match: "ids", nodes: ["diamond"] },
        set: { "node.shape": "diamond" },
    });
    await element.session.data.addNodes([
        { id: "wide", position: { x: -4, y: 0, z: 0 } },
        { id: "diamond", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "wide", dst: "diamond" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * Where a node's centre is drawn, plus an offset in CSS pixels.
 * @param element - The element.
 * @param id - The node.
 * @param dx - How far right of the centre.
 * @returns The point.
 */
function near(element: Graphty, id: string, dx = 0): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position);
    assert.isTrue(position.visible, `node ${id} is on screen`);

    return { x: position.x + dx, y: position.y };
}

describe.each(["2d", "3d"] as const)("in %s", (viewMode) => {
    it("a click on a flat diamond selects it", async () => {
        const element = await mounted(viewMode);

        await click(element, near(element, "diamond"));

        assert.strictEqual(element.getSelectedNode()?.id, "diamond");
    });

    it("a click near the end of a wide node, far from its centre, selects it", async () => {
        const element = await mounted(viewMode);
        const centre = near(element, "wide");
        const diamond = near(element, "diamond");
        // A node of size 1 would end a quarter of the way to the diamond; this one reaches further.
        const offset = (diamond.x - centre.x) * 0.15;

        await click(element, near(element, "wide", -offset));

        assert.strictEqual(element.getSelectedNode()?.id, "wide");
    });
});
