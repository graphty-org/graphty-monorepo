/**
 * @file A node that turns translucent after its edges are drawn stops its plain lines at its outline,
 * as one translucent from the start does (#8281), on both render paths.
 *
 * The edges were placed against opaque nodes, which hide a line's start at their center. A layer
 * that then sets `node.opacity` under 1 moves no node, so on `"objects"` the edges kept their
 * center-to-center lines and showed them through the body, where `"batched"` trims in its shader
 * (issue #9875). The picture after the late layer must be the picture of the same layer set first.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { type CanvasFrame, pixelsOverBar, png, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

const TRANSLUCENT = {
    name: "translucent",
    target: "node",
    selector: { match: "everything" },
    set: { "node.opacity": 0.5 },
} as const;

/**
 * Draw two plain edges and an arrowed one, with the translucent layer added before the data or
 * after the first settled frame.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param late - Whether the layer comes after the edges are drawn.
 * @returns The canvas.
 */
async function draw(path: "objects" | "batched", view: "2d" | "3d", late: boolean): Promise<CanvasFrame> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.append(element);
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 4 },
    });
    await element.session.styles.add({
        name: "node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": 1.2 },
    });
    if (!late) {
        await element.session.styles.add(TRANSLUCENT);
    }

    await element.session.data.addNodes([
        { id: "a", position: { x: -3, y: 0, z: 0 } },
        { id: "b", position: { x: 0, y: 1.5, z: 0 } },
        { id: "c", position: { x: 3, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([
        { source: "a", target: "b", directed: false },
        { source: "b", target: "c", directed: false },
        { source: "c", target: "a" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (late) {
        await element.session.styles.add(TRANSLUCENT);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
    }

    const frame = await readCanvas(element.graph);
    element.remove();
    return frame;
}

describe.each(["objects", "batched"] as const)("a node turning translucent after its edges are drawn, %s", (path) => {
    it.for(["3d", "2d"] as const)("stops plain lines at its outline in %s", async (view) => {
        const first = await draw(path, view, false);
        const late = await draw(path, view, true);
        const over = pixelsOverBar(first, late);
        if (over > 0) {
            console.log(`translucent first (y as read) ${png(first)}`);
            console.log(`translucent late (y as read) ${png(late)}`);
        }

        assert.equal(over, 0, "the late layer draws a different picture from the same layer set first");
    });
});
