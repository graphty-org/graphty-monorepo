/**
 * @file A translucent node with an edge through it draws the same on the `"batched"` path as on
 * `"objects"`, in Chromium and in WebKit (`GRAPHTY_PARITY_BROWSER=webkit`).
 *
 * WebKit interpolates a constant vertex alpha of 1 a hair below 1, and Babylon multiplies a thin
 * instance's alpha by it but not an ordinary instance's, so a 0.5-opacity node over the 245
 * background (122.5) rounded a level apart between the paths, and two where an edge crosses the
 * node (#9506). `RowPullPlugin` drops that multiply for a batch, whose color alpha is always 1.
 */

import "../../src/graphty-element";

import { afterEach, assert, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Channels that differ at all between two frames.
 * @param a - A frame.
 * @param b - A frame of the same size.
 * @returns How many.
 */
function channelsApart(a: CanvasFrame, b: CanvasFrame): number {
    let apart = 0;
    for (let i = 0; i < a.pixels.length; i++) {
        apart += a.pixels[i] === b.pixels[i] ? 0 : 1;
    }

    return apart;
}

it("draws a translucent node crossed by an edge the same on both render paths", async () => {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.append(element);
    await element.updateComplete;
    const { graph } = element;
    await element.session.data.addNodes([
        { id: "left", position: { x: -3, y: 0.2, z: 0.3 } },
        { id: "right", position: { x: 3, y: -0.2, z: -0.3 } },
        { id: "middle", position: { x: 0.1, y: 0, z: 0 } },
        { id: "near", position: { x: 1.2, y: 1, z: 0.6 } },
    ]);
    await element.session.data.addEdges([
        { source: "left", target: "right" },
        { source: "near", target: "left" },
    ]);
    await graph.setLayout("fixed", { dim: 3, spacing: 0 });
    await element.session.styles.add({
        name: "translucent blue",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#0000ff", "node.opacity": 0.5 },
    });
    await operationQueueOf(graph).waitForCompletion();
    await element.waitForStableFrame();

    graph.setRenderPath("objects");
    const objects = await readCanvas(graph);
    graph.setRenderPath("batched");
    const batched = await readCanvas(graph);

    assert.equal(graph.rowCounts.batchedNodes, 4, "every node is drawn by a batch");
    const background = objects.pixels.subarray(0, 4).join();
    const drawn = Array.from({ length: objects.pixels.length / 4 }, (_, p) =>
        objects.pixels.subarray(p * 4, p * 4 + 4),
    );
    assert.isAbove(drawn.filter((pixel) => pixel.join() !== background).length, 500, "the frame holds the graph");
    assert.equal(pixelsOverBar(objects, batched), 0, "a pixel is more than a level apart");
    assert.equal(channelsApart(objects, batched), 0, "the paths draw the translucent node differently");
});
