/**
 * @file A click selects a node; moving the pointer onto a different node then hovers that node, on
 * both render paths, as it does before any selection (issue #10161).
 *
 * The report came from a test whose 800 px element was wider than the test frame (414 px): the
 * second node was drawn past the frame's right edge, so the pointer sent there left the page, which
 * ends a hover, while `elementAt` (which reads canvas coordinates) still named the node. Every point
 * here is checked to be on the page first.
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, hover, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;
const COUNT = 20;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The element on a render path with a 5 by 4 grid of nodes in 2D.
 * @param renderPath - The render path.
 * @returns The element.
 */
async function mounted(renderPath: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = renderPath;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.config.set({ startingRows: true });
    await element.session.data.addNodes(
        Array.from({ length: COUNT }, (_, id) => ({
            id: `n${String(id)}`,
            position: { x: (id % 5) * 3 - 6, y: Math.floor(id / 5) * 3 - 4, z: 0 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} has a screen position`);
    const rect = element.getBoundingClientRect();
    const x = rect.left + position.x;
    const y = rect.top + position.y;
    assert.isTrue(x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight, `node ${id} is on the page`);
    return { x: position.x, y: position.y };
}

/**
 * Move the pointer onto a node and wait for the session to say it is hovered.
 * @param element - The element.
 * @param id - The node.
 * @returns What the session says is hovered then.
 */
async function hoverOnto(element: Graphty, id: string): Promise<string | number | null> {
    const hovered = new Promise<void>((resolve) => {
        const off = element.session.on("selection:hover-changed", ({ after }) => {
            if (after === id) {
                off();
                resolve();
            }
        });
    });
    await hover(element, at(element, id));
    await hovered;
    return element.session.selection.hovered;
}

describe.each(["objects", "batched"] as const)("hover after a selection, %s path", (renderPath) => {
    it("hovers the next node, and one further, after a click selected one", async () => {
        const element = await mounted(renderPath);
        await click(element, at(element, "n0"));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.strictEqual(element.session.selection.hovered, "n0", "the pointer rests on the selected node");
        assert.deepStrictEqual([...element.session.selection.nodes], ["n0"], "the click selected n0");

        assert.strictEqual(await hoverOnto(element, "n1"), "n1", "the pointer on the neighbor n1 hovers it");
        assert.strictEqual(await hoverOnto(element, "n13"), "n13", "and then n13");
    });
});
