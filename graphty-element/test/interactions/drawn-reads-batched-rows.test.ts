/**
 * @file On the batched render path, `nodeScreenPosition().visible` and `rowCounts` agree with what
 * the canvas shows after a click selects a node (issue #9232).
 *
 * The selection keeps the clicked node off its batch, which takes every row drawn from the same
 * source off the batch too. A row loaded with no `Node` can then be drawn by nothing (issue #9226);
 * whatever draws it, the public reads must say what the canvas shows: `visible` is false for a node
 * nothing draws, and the two `rowCounts` node counts add up to the nodes drawn.
 *
 * The click goes through the browser's input pipeline, and what is drawn is read from the rendered
 * pixel at each node's center.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { pixelsAt } from "../helpers/canvas-pixels";
import { drawnFrames } from "../helpers/drawn-frames";
import { click } from "../helpers/real-input";

const SIDE = 4;
const COUNT = SIDE * SIDE;
const CHAIN = SIDE * 2;

let element: Graphty | undefined;

afterEach(() => {
    element?.remove();
    element = undefined;
});

/**
 * Each node's screen read and whether the canvas shows it there.
 * @param shown - The element.
 * @returns Per node: whether `nodeScreenPosition` calls it visible, and whether its center pixel
 *     differs from the canvas corner.
 */
async function reads(shown: Graphty): Promise<{ id: number; visible: boolean; drawn: boolean }[]> {
    const ids = Array.from({ length: COUNT }, (_, id) => id);
    const spots = ids.map((id) => {
        const spot = shown.nodeScreenPosition(id);
        assert.isDefined(spot, `node ${String(id)} has a screen position`);
        return spot;
    });
    const [corner, ...centers] = await pixelsAt(shown, [{ x: 2, y: 2 }, ...spots]);
    return ids.map((id) => {
        const [r, g, b] = centers[id];
        const drawn = Math.hypot(r - corner[0], g - corner[1], b - corner[2]) >= 16;
        return { id, visible: spots[id].visible, drawn };
    });
}

describe("drawn reads on the batched path after a click selects a node", () => {
    it("report a node as drawn only when the canvas shows it", async () => {
        element = document.createElement("graphty-element");
        element.renderPath = "batched";
        element.style.cssText = "display:block;width:360px;height:360px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.config.set({ startingRows: true });
        await element.session.data.addNodes(
            Array.from({ length: COUNT }, (_, id) => ({
                id,
                position: { x: (id % SIDE) * 3 - 4.5, y: Math.floor(id / SIDE) * 3 - 4.5, z: 0 },
            })),
        );
        // Half the nodes in a chain, the rest with no edge.
        await element.session.data.addEdges(Array.from({ length: CHAIN - 1 }, (_, id) => ({ src: id, dst: id + 1 })));
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.setViewMode("2d");
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const clicked = element.nodeScreenPosition(1);
        assert.isDefined(clicked);
        await click(element, clicked);
        await drawnFrames(element.graph.getScene(), 1);
        await element.waitForStableFrame();
        assert.sameMembers([...element.session.selection.nodes], [1], "the click selected node 1");

        const after = await reads(element);
        const wrong = after.filter(({ visible, drawn }) => visible !== drawn);
        assert.deepEqual(wrong, [], "visible matches the canvas for every node");
        const counts = element.rowCounts;
        assert.equal(
            counts.batchedNodes + counts.objectNodes,
            after.filter(({ drawn }) => drawn).length,
            "rowCounts counts the nodes drawn",
        );
    });
});
