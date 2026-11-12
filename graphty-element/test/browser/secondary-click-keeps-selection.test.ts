/**
 * @file A right-click is how a reader asks for a menu about what is selected, so it must not
 * change the selection it asks about. A right-click on a node already in the selection keeps the
 * whole selection, and one on empty canvas keeps it too; a right-click on a node outside the
 * selection still selects that node, as a left click does. Clicks are real mouse input
 * (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, rightClick } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Three nodes in a row, drawn in 2D, with a and b selected.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
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
        { id: "b", position: { x: 0, y: 0, z: 0 } },
        { id: "c", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.session.selection.apply({ nodes: ["a", "b"] });
    return element;
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center, in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): { x: number; y: number } {
    const point = element.nodeScreenPosition(id);
    assert.isDefined(point, `node ${id} is on screen`);
    return { x: point.x, y: point.y };
}

/**
 * Let a few frames draw.
 * @param element - The element.
 */
async function frames(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 3);
}

describe("a right-click", () => {
    it("on a node in the selection keeps the whole selection", async () => {
        const element = await mounted();
        await rightClick(element, at(element, "b"));
        await frames(element);
        assert.sameMembers([...element.session.selection.nodes], ["a", "b"]);
    });

    it("on empty canvas keeps the selection", async () => {
        const element = await mounted();
        await rightClick(element, { x: WIDTH / 2, y: HEIGHT - 10 });
        await frames(element);
        assert.sameMembers([...element.session.selection.nodes], ["a", "b"]);
    });

    it("on a node outside the selection selects that node", async () => {
        const element = await mounted();
        await rightClick(element, at(element, "c"));
        await frames(element);
        assert.sameMembers([...element.session.selection.nodes], ["c"]);
    });

    it("leaves a left click as it was: a click on a selected node selects only it", async () => {
        const element = await mounted();
        await click(element, at(element, "b"));
        await frames(element);
        assert.sameMembers([...element.session.selection.nodes], ["b"]);
    });
});
