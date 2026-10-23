/**
 * @file A label's close button under real input: every click is made by the browser's own input
 * pipeline (test/helpers/real-input.ts), and every outcome is read through the element's public
 * API -- the selection, and the x's place on screen from `labelOf(id).closeRect`.
 *
 * The scene: node a at the origin, and node b further from the camera (the 3D camera looks along
 * +z) and to the side, so b is drawn inside a's label panel when that panel is centred on a.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, hover, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 2.5, y: 0, z: 6 } },
];

/**
 * Words long enough that a's panel reaches over b, and short enough that its x stays on the
 * canvas: a "center" label hangs in front of its node, toward the camera, so it is drawn larger
 * than the node's own depth would make it.
 */
const LONG = "a label quite wide";

/** A spot with nothing drawn under it. */
const EMPTY: Point = { x: 20, y: HEIGHT - 20 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with a's label centred on it, wide, and with or without the close button
 * only while a is selected.
 * @param closeButton - Whether the selected node's label has a close button.
 * @param onTop - Whether that label is drawn over the whole graph.
 * @returns The element.
 */
async function mounted(closeButton: boolean, onTop = false): Promise<Graphty> {
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
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    element.session.styles.add({
        name: "selected card",
        target: "node",
        selector: { match: "member", of: "selection" },
        set: {
            "node.label": LONG,
            "node.labelStyle": { location: "center", background: "#ffffff", padding: 8, closeButton, onTop },
        },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Wait until the element has applied the input just given and the picture has come to rest.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * The ids selected.
 * @param element - The element.
 * @returns The ids.
 */
function selected(element: Graphty): string[] {
    return element.session.selection.nodes.map(String);
}

/**
 * Click node a and wait for its card to be drawn.
 * @param element - The element.
 */
async function selectA(element: Graphty): Promise<void> {
    await click(element, at(element, "a"));
    await applied(element);
    assert.deepStrictEqual(selected(element), ["a"], "the click selected a");
    assert.strictEqual(element.labelOf("a")?.text, LONG, "a's card is drawn");
}

describe("a label's close button", () => {
    it("a click on the x clears the selection", async () => {
        const element = await mounted(true);
        await selectA(element);

        const rect = element.labelOf("a")?.closeRect;
        assert.isDefined(rect, "the card reports where its x is");
        const a = at(element, "a");
        assert.isAbove(rect.x, a.x, "the x is right of the node");
        assert.isBelow(rect.y, a.y, "the x is above the node");
        assert.isAtMost(rect.x + rect.width, WIDTH, "the x is on the canvas");

        await click(element, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
        await applied(element);

        assert.deepStrictEqual(selected(element), [], "the x cleared the selection");
    });

    it("a click on the panel away from the x keeps the selection and does not reach the node behind", async () => {
        const element = await mounted(true);
        await selectA(element);

        const rect = element.labelOf("a")?.closeRect;
        assert.isDefined(rect);
        const b = at(element, "b");
        assert.isBelow(b.x, rect.x, "b is drawn left of the x, under the panel");

        await click(element, b);
        await applied(element);

        assert.deepStrictEqual(selected(element), ["a"], "the click on the panel changed nothing");
    });

    it("a label drawn on top takes the click even over a node nearer the camera", async () => {
        const element = await mounted(true, true);
        // c sits in front of a (the camera looks along +z), so it is the nearest hit under the
        // panel; the panel is drawn over it, so the click is the panel's.
        await element.session.data.addNodes([{ id: "c", position: { x: -1.5, y: 0, z: -3 } }]);
        await applied(element);
        await selectA(element);

        const rect = element.labelOf("a")?.closeRect;
        assert.isDefined(rect);
        const c = at(element, "c");
        assert.isBelow(c.x, rect.x, "c is drawn left of the x, under the panel");

        await click(element, c);
        await applied(element);

        assert.deepStrictEqual(selected(element), ["a"], "the click on the panel did not reach c");
    });

    it("a background click still clears the selection", async () => {
        const element = await mounted(true);
        await selectA(element);

        await click(element, EMPTY);
        await applied(element);

        assert.deepStrictEqual(selected(element), []);
    });

    it("shows the pointer cursor over the x and not over the rest of the panel", async () => {
        const element = await mounted(true);
        await selectA(element);
        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);

        const rect = element.labelOf("a")?.closeRect;
        assert.isDefined(rect);
        await hover(element, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
        assert.strictEqual(canvas.style.cursor, "pointer", "over the x");

        await hover(element, at(element, "b"));
        assert.notStrictEqual(canvas.style.cursor, "pointer", "over the panel body");
    });

    it("a label without one behaves as it did before close buttons: a click on it reaches no node", async () => {
        const element = await mounted(false);
        await selectA(element);
        assert.isUndefined(element.labelOf("a")?.closeRect, "no x, no rect");

        // A label plane stops a click whether or not it has a button: the click is a click on
        // no node, which clears the selection, and b behind it is not selected.
        await click(element, at(element, "b"));
        await applied(element);

        assert.deepStrictEqual(selected(element), [], "the click on the label selected nothing");
    });
});
