/**
 * @file A 2D scene draws coplanar opaque meshes in the order their materials were made. On the `"objects"` path every
 * line of one width shares one line batch, made by the first edge of that width, so a later line of that width draws
 * under a head made in between. Under `renderPath: "batched"` a plain line is pulled from the row table, and its batch
 * was made at its first row, after that head: the line drew over it (the GML synthetic-coverage sample). A 2D pulled
 * batch is now one width and draws right after the line batch of its width, and the picture is the objects path's.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Three edges in this order: a labeled line 3 wide far off (an `Edge` on both paths, which makes the line batch of
 * width 3), a red arrow down whose large head ends on the third, and that third, a plain blue line 3 wide.
 * @param path - The render path.
 * @returns The element, its picture final.
 */
async function drawn(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = "2d";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 3, z: 0 } },
        { id: "b", position: { x: -2, y: 3, z: 0 } },
        { id: "c", position: { x: 0, y: 3, z: 0 } },
        { id: "d", position: { x: 0, y: -1, z: 0 } },
        { id: "e", position: { x: -3, y: 0, z: 0 } },
        { id: "f", position: { x: 3, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.session.styles.add({
        name: "lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none", "edge.width": 3, "edge.color": "#3366ff" },
    } as never);
    await element.session.styles.add({
        name: "labeled",
        target: "edge",
        selector: { match: "has", path: "data.labeled" },
        set: { "edge.label": "far", "edge.color": "#888888" },
    } as never);
    await element.session.styles.add({
        name: "arrow",
        target: "edge",
        selector: { match: "has", path: "data.arrow" },
        set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 4, "edge.width": 1, "edge.color": "#e6194b" },
    } as never);
    await element.session.data.addEdges([
        { src: "a", dst: "b", labeled: true },
        { src: "c", dst: "d", arrow: true },
        { src: "e", dst: "f" },
    ]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("a 2D pulled line of a width an Edge drew first", () => {
    it("draws under a head made after that Edge, as the objects path does", async () => {
        const objects = await drawn("objects");
        const want = await readCanvas(objects.graph);
        objects.remove();
        const batched = await drawn("batched");
        assert.isAbove(batched.graph.rowCounts.pulledEdges, 0, "the blue line is pulled");
        assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
    });
});
