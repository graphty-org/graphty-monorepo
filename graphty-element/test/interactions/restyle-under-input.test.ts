/**
 * @file A restyle while the reader is working: the camera stays where the reader put it, and a hover
 * ends when the pointer leaves, however many times the node was restyled while it was hovered.
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, hover, nextFrame, type Point, wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

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
async function mounted(layout: "fixed" | "default" = "fixed"): Promise<Graphty> {
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
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    if (layout === "fixed") {
        await element.graph.setLayout("fixed", { dim: 3 });
    }
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
 * Let a few frames run.
 * @param count - How many.
 */
async function frames(count = 3): Promise<void> {
    for (let i = 0; i < count; i++) {
        await nextFrame();
    }
}

/**
 * The Selected starting row's node layer.
 * @param element - The element.
 * @returns Its id.
 */
function selectedNodeLayer(element: Graphty): string {
    const layer = element.session.styles.list().find((each) => each.name === "Selected" && each.target === "node");
    assert.isDefined(layer, "the Selected row has a node part");
    return layer.id;
}

/**
 * Restyle the Selected row's halo color and let the repaint land.
 * @param element - The element.
 * @param color - The new color.
 */
async function restyleHalo(element: Graphty, color: string): Promise<void> {
    const id = selectedNodeLayer(element);
    const layer = element.session.styles.get(id);
    await element.session.styles.update(id, { set: { ...layer?.set, "node.haloColor": color } });
    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await frames();
}

describe("a restyle", () => {
    it.each(["fixed", "default"] as const)(
        "leaves the camera where the reader zoomed it (%s layout)",
        async (layout) => {
            const element = await mounted(layout);
            await click(element, at(element, "a"));
            await frames();
            assert.strictEqual(element.getSelectedNode()?.id, "a");

            assert.isFalse(element.cameraPlaced, "the element framed the graph itself");
            await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -400);
            await frames();
            await element.waitForStableFrame();
            assert.isTrue(element.cameraPlaced, "the reader's wheel placed the camera");
            const zoomed = JSON.stringify(element.getCameraState());

            await restyleHalo(element, "#ff00ff");
            assert.strictEqual(JSON.stringify(element.getCameraState()), zoomed, "the halo color changed nothing else");

            await restyleHalo(element, "#00ffff");
            assert.strictEqual(JSON.stringify(element.getCameraState()), zoomed, "nor did a second change");
        },
    );

    it("never takes back a zoom the reader made while the layout was still moving", async () => {
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
        const ids = Array.from({ length: 40 }, (_, i) => `n${String(i)}`);
        await element.session.data.addNodes(ids.map((id) => ({ id })));
        await element.session.data.addEdges(ids.slice(1).map((id, i) => ({ src: ids[i], dst: id })));
        await frames();

        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -400);
        await frames();
        const zoomed = JSON.stringify(element.getCameraState());
        await element.waitForSettled();
        await element.waitForStableFrame();

        assert.strictEqual(
            JSON.stringify(element.getCameraState()),
            zoomed,
            "the settled layout framed nothing over it",
        );
    });

    it("of a hovered node ends the hover when the pointer leaves", async () => {
        const element = await mounted();
        await hover(element, EMPTY);
        await frames(1);
        await hover(element, at(element, "a"));
        await frames();
        assert.strictEqual(element.session.selection.hovered, "a", "pointing at a hovers it");

        // A click selects the hovered node, which restyles it; so does a halo change.
        await click(element, at(element, "a"));
        await frames();
        await restyleHalo(element, "#ff00ff");
        assert.strictEqual(element.session.selection.hovered, "a", "still under the pointer");

        await hover(element, EMPTY);
        await frames();
        assert.isNull(element.session.selection.hovered, "the pointer left, so nothing is hovered");
    });
});
