/**
 * @file The framing of a graph whose nodes are sized on screen (`node.sizeSpace: "screen"`) is the same
 * however the frames before it ran.
 *
 * Zoom-to-fit grows its box by every node's drawn box, and a screen-sized node's size in the scene is set for
 * the camera looking then. A framing measured the nodes at whatever size the frame before had left them, so the
 * camera it chose depended on which frames had run: a join preview's dashed new nodes, sized on screen, drew
 * its story framed a few millionths apart from one capture to the next. Pinned here: framing again changes
 * nothing, and neither does where the camera stood before.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = Array.from({ length: 12 }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % NODES.length].id }));

/**
 * Where the camera stands and how much it shows, to the last digit a double holds.
 * @param element - The element.
 * @returns The camera's position and, in 2D, its half-width, as text.
 */
function framing(element: Graphty): string {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    const { x, y, z } = camera.globalPosition;
    return [x, y, z, camera.orthoRight ?? 0].map((value) => value.toPrecision(15)).join(",");
}

describe("framing with nodes sized on screen", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "900px";
        container.style.height = "600px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        container.remove();
    });

    for (const dimension of ["2d", "3d"] as const) {
        it(`frames the nodes at the size they are drawn for its own camera (${dimension})`, async () => {
            element.nodeData = NODES;
            element.edgeData = EDGES;
            await element.session.layout.setDimension(dimension);
            await element.session.layout.set("circular");
            await element.session.styles.add({
                name: "screen nodes",
                target: "node",
                selector: { match: "everything" },
                set: { "node.sizeSpace": "screen" },
            });
            await element.session.styles.settled();
            element.zoomToFit();
            await element.waitForStableFrame();
            const first = framing(element);

            // The nodes are now sized for that camera; framing them again changes nothing.
            element.zoomToFit();
            await element.waitForStableFrame();
            assert.strictEqual(framing(element), first, "framed again");

            // Nor does a fit from a camera that stood somewhere else, sizing the nodes for it first.
            await element.graph.setCameraState(dimension === "2d" ? { zoom: 3 } : { cameraDistance: 5 });
            await element.waitForStableFrame();
            element.zoomToFit();
            await element.waitForStableFrame();
            assert.strictEqual(framing(element), first, "framed from elsewhere");
        });
    }
});
