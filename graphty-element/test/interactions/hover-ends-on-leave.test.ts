/**
 * @file A hover ends when the pointer leaves the canvas: for the page beside it, or for a menu
 * the page opens over it on a right-click. The scene hears the pointer only while it is over the
 * canvas, so without this the Hovered row kept painting a node the pointer had long left.
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { hover, nextFrame, type Point, rightClick } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with two nodes at fixed places and the starting rows on, drawn.
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
    await element.session.config.set({ startingRows: true });
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
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
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * How many nodes the Hovered row paints.
 * @param element - The element.
 * @returns The count.
 */
function hoveredCount(element: Graphty): number {
    const layer = element.session.styles.list().find((each) => each.name === "Hovered" && each.target === "node");
    assert.isDefined(layer, "the starting rows include Hovered");
    return element.session.styles.counts(layer?.id ?? "").matched;
}

/**
 * Point at a node and see it hovered.
 * @param element - The element.
 * @param id - The node.
 */
async function pointAt(element: Graphty, id: string): Promise<void> {
    await hover(element, at(element, id));
    await nextFrame();
    assert.strictEqual(element.session.selection.hovered, id, "pointing at a node hovers it");
    assert.strictEqual(hoveredCount(element), 1);
}

describe("a hover", () => {
    it("ends when the pointer leaves the canvas, and starts again when it comes back", async () => {
        const element = await mounted();
        const moves: string[] = [];
        element.session.on("selection:hover-changed", ({ before, after }) => {
            moves.push(`${String(before)} -> ${String(after)}`);
        });
        await pointAt(element, "a");

        // Straight down off the canvas, onto the page under it.
        await hover(element, { x: at(element, "a").x, y: HEIGHT + 20 });
        await nextFrame();

        assert.isNull(element.session.selection.hovered, "the pointer is off the canvas");
        assert.strictEqual(hoveredCount(element), 0);

        await pointAt(element, "a");
        assert.deepStrictEqual(moves, ["null -> a", "a -> null", "null -> a"], "a host hears every change");
    });

    it("ends when the pointer moves onto a menu opened over the canvas", async () => {
        const element = await mounted();
        // The page's own menu, as an application draws one: over the canvas, beside the pointer.
        element.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            const menu = document.createElement("div");
            menu.style.cssText = `position:fixed;left:${String(event.clientX + 4)}px;top:${String(event.clientY + 4)}px;width:120px;height:80px;background:#fff`;
            menu.tabIndex = -1;
            menu.addEventListener("keydown", (key) => {
                if (key.key === "Escape") {
                    menu.remove();
                }
            });
            document.body.appendChild(menu);
            cleanups.push(() => {
                menu.remove();
            });
            menu.focus();
        });

        await pointAt(element, "a");
        const node = at(element, "a");
        await rightClick(element, node);
        await hover(element, { x: node.x + 40, y: node.y + 40 });
        await userEvent.keyboard("{Escape}");
        await nextFrame();

        assert.isNull(element.session.selection.hovered, "the pointer went to the menu");
        assert.strictEqual(hoveredCount(element), 0);
    });
});
