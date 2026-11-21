/**
 * @file A click that selects a node on the batched render path in 2D, with the starting rows on,
 * changes only the selection: every node is still drawn afterwards (issue #9226).
 *
 * The selection ring keeps the clicked node off the batch, which puts every row drawn from the same
 * source back on its own mesh. A row loaded with no `Node` has no mesh, so it has to get one: the
 * nodes the selection does not reach (here, the ones with no edge to the clicked node) were drawn
 * by nothing.
 *
 * The click is made by the browser's own input pipeline and what is drawn is read from the
 * rendered pixels at each node's screen position, as a reader would see it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, type Point } from "../helpers/real-input";

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
 * The element on the batched path with the starting rows on and a 5 by 4 grid of nodes, the first
 * half in a chain and the rest with no edge, in 2D.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = "batched";
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
            id,
            position: { x: (id % 5) * 3 - 6, y: Math.floor(id / 5) * 3 - 4, z: 0 },
        })),
    );
    await element.session.data.addEdges(Array.from({ length: COUNT / 2 - 1 }, (_, id) => ({ src: id, dst: id + 1 })));
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
function at(element: Graphty, id: number): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${String(id)} has a screen position`);
    return { x: position.x, y: position.y };
}

/**
 * The nodes whose center pixel is the canvas color: not drawn.
 * @param element - The element.
 * @returns Their ids.
 */
async function undrawn(element: Graphty): Promise<number[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    element.graph.scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const scale = width / WIDTH;
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    const color = (point: Point): [number, number, number] => {
        const o = ((height - 1 - Math.round(point.y * scale)) * width + Math.round(point.x * scale)) * 4;
        return [pixels[o], pixels[o + 1], pixels[o + 2]];
    };
    const canvas = color({ x: 4, y: 4 });
    return Array.from({ length: COUNT }, (_, id) => id).filter((id) => {
        const [r, g, b] = color(at(element, id));
        return Math.hypot(r - canvas[0], g - canvas[1], b - canvas[2]) < 16;
    });
}

describe("selecting a node on the batched path in 2D", () => {
    it("keeps every node drawn", async () => {
        const element = await mounted();
        assert.equal(element.rowCounts.batchedNodes, COUNT, "a batch draws every node");
        assert.deepEqual(await undrawn(element), [], "every node is drawn before the click");

        await click(element, at(element, 7));
        await drawnFrames(element.graph.getScene(), 1);
        await element.waitForStableFrame();

        assert.sameMembers([...element.session.selection.nodes], [7], "the click selected node 7");
        assert.deepEqual(await undrawn(element), [], "every node is drawn after the click");
    });
});
