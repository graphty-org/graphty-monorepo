/**
 * @file The framing of a graph whose labels are sized on screen (`sizeMode: "screen"`) is the same
 * however the frames before it ran.
 *
 * Zoom-to-fit grows its box by every label plane's world bounds, and a screen-size label's world
 * size is set every frame for the camera looking then. A framing measured the labels at whatever
 * size the frame before had left them -- their first, unfitted size, or the size for a camera
 * since replaced -- so the camera it chose depended on which frames had run, and a gephi JSON
 * specimen story drew two pictures (issue #3106). Pinned here: the framing `waitForStableFrame()`
 * resolves with is where an explicit fit, taken with the labels already sized, puts the camera.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = Array.from({ length: 12 }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % NODES.length].id }));

/**
 * Where the camera stands and how much it shows.
 * @param element - The element.
 * @returns The camera's position and, in 2D, its half-width, as text.
 */
function framing(element: Graphty): string {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    const { x, y, z } = camera.globalPosition;
    return [x, y, z, camera.orthoRight ?? 0].map((value) => value.toFixed(4)).join(",");
}

describe("framing with screen-size labels", () => {
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
        it(`frames the labels at the size they are drawn for its own camera (${dimension})`, async () => {
            element.nodeData = NODES;
            element.edgeData = EDGES;
            await element.session.layout.setDimension(dimension);
            await element.session.layout.set("circular");
            await element.session.styles.add({
                name: "screen labels",
                target: "node",
                selector: { match: "everything" },
                set: {
                    "node.label": "a long label beside its node",
                    "node.labelStyle": { sizeMode: "screen", location: "right" },
                    "node.labelSize": 40,
                },
            });
            await element.session.styles.settled();
            element.zoomToFit();
            await element.waitForStableFrame();
            const first = framing(element);

            // The labels are now sized for that camera; framing them again changes nothing.
            element.zoomToFit();
            await element.waitForStableFrame();
            assert.strictEqual(framing(element), first);
        });
    }
});
