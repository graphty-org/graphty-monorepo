/**
 * @file `camera.hoverWhileDragging`: a drag that turns the camera crosses a node. On (the default),
 * the node is hovered under the drag, as it always was. Off, nothing is hovered, no tooltip opens
 * and no `node-hover` fires until the release, and then the node under the pointer is hovered
 * without another move (issue #10221).
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { moveHeld, nextFrame, type Point, press, release } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with the starting rows on and node "a" at the middle of the graph, the point
 * the camera turns about, so a drag that turns the camera leaves "a" where it is drawn.
 * @param hoverWhileDragging - `camera.hoverWhileDragging`, or undefined to leave the default.
 * @returns The element.
 */
async function mounted(hoverWhileDragging?: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    if (hoverWhileDragging !== undefined) {
        element.layoutBehavior = { camera: { hoverWhileDragging } };
    }

    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.config.set({ startingRows: true });
    await element.session.data.addNodes([
        { id: "a", position: { x: 0, y: 0, z: 0 } },
        { id: "b", position: { x: -4, y: 0, z: 0 } },
        { id: "c", position: { x: 4, y: 0, z: 0 } },
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

/** What a host heard while the camera was dragged and after the release. */
interface Heard {
    /** Each `selection:hover-changed`, as "before -> after", with "released" once the button is up. */
    readonly changes: string[];
    /** How many `graphty-node-hover` events fired. */
    nodeHovers: number;
    /** Whether the button is up. */
    released: boolean;
}

/**
 * Listen to every hover a host can hear.
 * @param element - The element.
 * @returns What was heard, filled in as it is.
 */
function listen(element: Graphty): Heard {
    const heard: Heard = { changes: [], nodeHovers: 0, released: false };
    element.session.on("selection:hover-changed", ({ before, after }) => {
        heard.changes.push(`${String(before)} -> ${String(after)}${heard.released ? " (released)" : ""}`);
    });
    element.addEventListener("graphty-node-hover", () => {
        heard.nodeHovers++;
    });
    return heard;
}

/**
 * The next time "a" becomes hovered.
 * @param element - The element.
 * @returns A promise settled when it is (at once when it already is).
 */
function aHovered(element: Graphty): Promise<void> {
    return new Promise((resolve) => {
        if (element.session.selection.hovered === "a") {
            resolve();
            return;
        }

        const off = element.session.on("selection:hover-changed", ({ after }) => {
            if (after === "a") {
                off();
                resolve();
            }
        });
    });
}

/**
 * Press on the empty canvas below "a" and drag the camera up across it, in steps, stopping on it.
 * @param element - The element.
 * @returns Where "a" is drawn, where the pointer stopped.
 */
async function dragAcross(element: Graphty): Promise<Point> {
    const node = at(element, "a");
    const start = { x: node.x, y: node.y + 100 };
    await press(element, start);
    for (let step = 1; step <= 5; step++) {
        await moveHeld(element, { x: node.x, y: start.y - step * 20 });
        await nextFrame();
    }

    return node;
}

describe("camera.hoverWhileDragging", () => {
    it("on by default: a camera drag hovers the node it crosses", async () => {
        const element = await mounted();
        const heard = listen(element);
        const hovered = aHovered(element);

        const node = await dragAcross(element);
        await hovered;

        assert.deepStrictEqual(heard.changes, ["null -> a"], "the node was hovered under the drag");
        assert.strictEqual(heard.nodeHovers, 1);
        await release(element, node);
    });

    it("off: a camera drag hovers nothing, and the release hovers the node under the pointer", async () => {
        const element = await mounted(false);
        const heard = listen(element);

        const node = await dragAcross(element);
        await nextFrame();
        assert.isNull(element.session.selection.hovered, "nothing is hovered under the drag");
        assert.strictEqual(heard.nodeHovers, 0, "no node-hover fired under the drag");

        const hovered = aHovered(element);
        heard.released = true;
        await release(element, node);
        await hovered;

        assert.deepStrictEqual(heard.changes, ["null -> a (released)"], "the only hover came with the release");
        assert.strictEqual(heard.nodeHovers, 1, "node-hover fired once, for the release");
    });
});
