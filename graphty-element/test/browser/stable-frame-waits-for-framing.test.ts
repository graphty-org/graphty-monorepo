/**
 * @file `waitForStableFrame()` after a switch to 2D and a new layout waits for every framing the
 * element owes, so what a consumer changes afterwards cannot reach a framing still on its way.
 *
 * `layout.set()` and `layout.setDimension()` settle before the camera has framed the arrangement
 * they placed: the framing is answered on later frames -- once for the new layout, and once more
 * when it first settles, after any style paint in flight. A framing still owed picks up the view
 * insets in force when it lands, so an overlay that sets an inset in between (a key card) changes
 * the picture. That is what made a graphty story draw two pictures. Pinned here: once
 * `waitForStableFrame()` resolves, no framing is owed, the camera is where an explicit fit puts
 * it, and a later inset change and style edit do not move it.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const COUNT = 115;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index * 7 + 3) % COUNT].id }));

/**
 * Where the 2D camera stands and how much it shows.
 * @param element - The element.
 * @returns The camera's x, y and half-width, as text.
 */
function framing(element: Graphty): string {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    const { x, y } = camera.position;
    return [x, y, camera.orthoRight ?? Number.NaN].map((value) => value.toFixed(4)).join(",");
}

describe("waitForStableFrame after a dimension and layout change", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1100px";
        container.style.height = "800px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
    });

    afterEach(() => {
        element.remove();
        container.remove();
    });

    it("resolves with the framing final, so a later inset or style change moves nothing", async () => {
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await element.session.layout.setDimension("2d");
        await element.session.layout.set("circular");
        await element.session.styles.settled();

        await element.waitForStableFrame();

        assert.isFalse(element.graph.getUpdateManager().isZoomToFitEnabled(), "no framing is owed");
        const settled = framing(element);

        // The framing that landed is the whole graph's: an explicit fit now puts the camera there too.
        element.zoomToFit();
        await element.waitForStableFrame();
        assert.strictEqual(framing(element), settled);

        // A key card appears and a layer is painted: neither moves a camera with nothing owed.
        element.viewInsets = { left: 300 };
        await element.session.styles.add({
            name: "red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await element.waitForStableFrame();
        assert.strictEqual(framing(element), settled);
    });
});
