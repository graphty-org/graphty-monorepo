/**
 * @file The element says when its nodes are first on screen.
 *
 * A page that shows a loading placeholder over the graph takes it away on `graph-first-frame`
 * (or once `isGraphDrawn` is true). It fires once the nodes are drawn -- not when the empty canvas
 * first draws, and not only once the layout has finished -- and again when a graph emptied of every
 * node draws its next ones.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = Array.from({ length: 12 }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id }));

/**
 * The next `graph-first-frame` the element sends, and whether every node mesh was ready then.
 * @param element - The element.
 * @returns Settles with the state seen as the event fired.
 */
function nextFirstFrame(element: Graphty): Promise<{ drawn: boolean; meshesReady: boolean }> {
    return new Promise((resolve) => {
        element.addEventListener(
            "graph-first-frame",
            () => {
                const meshes = element.graph.getScene().meshes.filter((mesh) => mesh.isEnabled() && mesh.isVisible);
                resolve({ drawn: element.isGraphDrawn, meshesReady: meshes.every((mesh) => mesh.isReady(true)) });
            },
            { once: true },
        );
    });
}

describe("graph-first-frame", () => {
    let element: Graphty;

    beforeEach(() => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "600px";
        element.style.height = "400px";
        document.body.appendChild(element);
    });

    afterEach(() => {
        element.remove();
    });

    it("fires once the nodes are drawn, and again after the graph is emptied and refilled", async () => {
        assert.isFalse(element.isGraphDrawn, "an empty graph is not drawn");

        const first = nextFirstFrame(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        const seen = await first;
        assert.isTrue(seen.drawn, "isGraphDrawn is true when the event fires");
        assert.isTrue(seen.meshesReady, "every shown mesh had its shader when the event fired");

        await element.waitForStableFrame();
        assert.isTrue(element.isGraphDrawn, "still drawn once the picture is final");

        element.clearData();
        await element.waitForStableFrame();
        assert.isFalse(element.isGraphDrawn, "an emptied graph is not drawn");

        const again = nextFirstFrame(element);
        element.nodeData = NODES;
        assert.isTrue((await again).drawn, "the next nodes are announced again");
    });
});
