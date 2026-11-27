/**
 * @file A right-button drag on the 3D canvas pans for as long as the button is held, wherever the
 * pointer goes, and asks for no context menu; a right-click asks for exactly one. On Linux and
 * macOS the browser asks for the menu at the right press, before a click can be told from a drag,
 * and a page's menu that opens there takes focus from the canvas (which made Babylon.js let go of
 * the pointer). The page here is a consumer like any other: it opens its "menu" (focuses a sibling)
 * on the element's `contextmenu` event.
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { hover, moveHeld, nextFrame, type Point, press, release, rightClick } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A spot on the canvas with no node under it. */
const START: Point = { x: 60, y: 40 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** The element, the sibling beside it, and how many menus the page was asked for. */
interface Page {
    readonly element: Graphty;
    readonly menus: () => number;
}

/**
 * A 3D element with a focusable sibling below it, and a page that "opens its menu" on the
 * element's `contextmenu` by focusing that sibling, as a real menu takes focus.
 * @returns The page.
 */
async function mounted(): Promise<Page> {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    const sibling = document.createElement("div");
    sibling.tabIndex = 0;
    sibling.style.width = `${String(WIDTH)}px`;
    sibling.style.height = "300px";
    row.append(element, sibling);
    document.body.appendChild(row);
    cleanups.push(() => {
        row.remove();
    });
    let menus = 0;
    element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        menus++;
        sibling.focus();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, menus: () => menus };
}

/**
 * The camera as the element reports it.
 * @param element - The element.
 * @returns The camera state as a string.
 */
function camera(element: Graphty): string {
    return JSON.stringify(element.getCameraState());
}

describe("a right-button drag on the 3D canvas", () => {
    it("keeps panning over a sibling, stops at a release there, and asks for no menu", async () => {
        const { element, menus } = await mounted();

        await press(element, START, undefined, "right");
        for (let y = START.y + 40; y <= HEIGHT + 200; y += 40) {
            await moveHeld(element, { x: START.x, y }, undefined, "right");
            await nextFrame();
        }
        // Over the sibling, with the button still held: the camera still follows the pointer.
        const over = camera(element);
        await moveHeld(element, { x: START.x, y: HEIGHT + 240 }, undefined, "right");
        await drawnFrames(element.graph.getScene(), 2);
        assert.notStrictEqual(camera(element), over, "a move over the sibling pans the camera");

        await release(element, { x: START.x, y: HEIGHT + 240 }, undefined, "right");
        await nextFrame();
        assert.strictEqual(menus(), 0, "a right-drag that panned asks for no context menu");

        // The drag is over: moving back over the canvas with no button held moves nothing.
        const released = camera(element);
        for (let y = HEIGHT - 40; y >= START.y; y -= 60) {
            await hover(element, { x: START.x, y });
            await nextFrame();
        }
        await drawnFrames(element.graph.getScene(), 2);
        assert.strictEqual(camera(element), released, "hovering after the release pans nothing");
    });

    it("asks for one context menu on a right-click, at the click", async () => {
        const { element, menus } = await mounted();
        const before = camera(element);

        await rightClick(element, START);
        await nextFrame();

        assert.strictEqual(menus(), 1, "a right-click asks for one context menu");
        assert.strictEqual(camera(element), before, "a right-click pans nothing");
    });
});
