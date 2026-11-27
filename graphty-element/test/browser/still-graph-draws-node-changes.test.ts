/**
 * @file A still graph on the objects path draws a change to a node's size, shape or place at once.
 *
 * THE RISK. When nothing moves the element freezes Babylon's list of what is drawn, the world
 * matrices of what is in it, and the source meshes that upload their instances' matrices
 * (`UpdateManager.settleActiveMeshFreeze`, issue #10116). Anything that changes a node's matrix
 * while frozen must thaw them first, or the frame keeps drawing the node as it was.
 *
 * WHAT IS MEASURED. How many canvas pixels differ from the background, on frames drawn after the
 * change, against the same count for a graph that started with the change.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { drag } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Five nodes in a row on the objects path, drawn in 2D, drawn every frame, settled and frozen.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderPath = "objects";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setRenderSettings({ onDemand: false });
    await element.session.data.addNodes(
        Array.from({ length: 5 }, (_unused, i) => ({ id: `n${String(i)}`, position: { x: (i - 2) * 4, y: 0, z: 0 } })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    // A few frames past the stable one, so the freeze has landed.
    await drawnFrames(element.graph.getScene(), 4);
    return element;
}

/**
 * How many canvas pixels differ from the corner pixel, read after the next frames.
 * @param element - The element.
 * @returns The count.
 */
async function drawnPixels(element: Graphty): Promise<number> {
    await drawnFrames(element.graph.getScene(), 3);
    const { engine } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const rgba = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    let count = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] !== rgba[0] || rgba[i + 1] !== rgba[1] || rgba[i + 2] !== rgba[2]) {
            count++;
        }
    }

    return count;
}

describe("a still graph on the objects path", () => {
    it("draws a style layer's new node size at once", async () => {
        const element = await mounted();
        const before = await drawnPixels(element);
        const layer = await element.session.styles.add({
            name: "Big n2",
            target: "node",
            selector: { match: "ids", nodes: ["n2"] },
            set: { "node.size": 2.5 },
        });
        await element.session.styles.settled();
        const grown = await drawnPixels(element);
        assert.isAbove(grown, before * 1.5, "the grown node covers more of the canvas");
        await element.session.styles.update(layer.id, { set: { "node.size": 1 } });
        await element.session.styles.settled();
        const shrunk = await drawnPixels(element);
        assert.isBelow(shrunk, grown, "and less again once the layer shrinks it");
    });

    it("draws a style layer's new node shape at once", async () => {
        const element = await mounted();
        const before = await drawnPixels(element);
        await element.session.styles.add({
            name: "Box n2",
            target: "node",
            selector: { match: "ids", nodes: ["n2"] },
            set: { "node.shape": "box", "node.size": 2.5 },
        });
        await element.session.styles.settled();
        assert.isAbove(await drawnPixels(element), before * 1.3, "the big box covers more of the canvas");
    });

    it("draws a dragged node where it was dropped", async () => {
        const element = await mounted();
        const from = element.nodeScreenPosition("n2");
        assert.isDefined(from);
        const to = { x: from.x, y: from.y + 80 };
        await drag(element, { x: from.x, y: from.y }, to);
        await drawnFrames(element.graph.getScene(), 3);
        const placed = element.nodeScreenPosition("n2");
        assert.isDefined(placed);
        assert.isAbove(placed.y, from.y + 40, "the node moved with the drag");
        const { engine } = element.graph;
        const scale = engine.getRenderWidth() / WIDTH;
        const read = (await engine.readPixels(
            Math.round(placed.x * scale),
            engine.getRenderHeight() - Math.round(placed.y * scale) - 1,
            1,
            1,
        )) as unknown as Uint8Array;
        const corner = (await engine.readPixels(0, 0, 1, 1)) as unknown as Uint8Array;
        assert.notDeepEqual([...read.slice(0, 3)], [...corner.slice(0, 3)], "and is drawn where it was dropped");
    });

    it("draws a consumer's change to a node's mesh at once", async () => {
        const element = await mounted();
        const node = element.graph.getNode("n2");
        assert.isDefined(node);
        const { mesh } = node;
        const before = await drawnPixels(element);
        mesh.scaling.scaleInPlace(2.5);
        assert.isAbove(await drawnPixels(element), before * 1.5, "the scaled mesh covers more of the canvas");
    });
});
