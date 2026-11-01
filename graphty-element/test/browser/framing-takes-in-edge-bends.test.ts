/**
 * @file Zoom-to-fit frames the points an edge is drawn through, not only its nodes (issue #3097).
 * An edge drawn through a bend far above its two nodes ran off the top of the canvas, because the
 * camera framed the nodes' box alone.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const WIDTH = 480;
const HEIGHT = 360;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding two nodes side by side and one edge between them, bent to a point
 * three edge-lengths above the line between them, and framed.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();

    await element.session.styles.add({
        name: "bent edge",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.bends": "0.5,3" },
    });
    await element.session.data.addNodes([
        { id: "a", position: { x: -2, y: 0, z: 0 } },
        { id: "b", position: { x: 2, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    element.zoomToFit();
    await element.waitForStableFrame();

    return element;
}

describe("zoom-to-fit frames an edge's bends", () => {
    it.each(["2d", "3d"] as const)("%s: the farthest bend of a bent edge is on screen", async (viewMode) => {
        const element = await mounted(viewMode);
        const [edge] = element.graph.getDataManager().edges.values();
        const curve = edge.drawnCurve;
        assert.isNotNull(curve, "the edge is drawn through its bend");
        assert.isAtLeast(curve.length, 3);

        // The point of the bend farthest from the line between the nodes.
        const farthest = curve.reduce((best, point) => (point.y > best.y ? point : best));
        assert.isAbove(farthest.y, 4, "the bend reaches well above the nodes");

        const at = element.graph.worldToScreen(farthest);
        // half a pixel for rounding
        assert.isTrue(
            at.x >= -0.5 && at.x <= WIDTH + 0.5 && at.y >= -0.5 && at.y <= HEIGHT + 0.5,
            `bend at ${at.x.toFixed(1)}, ${at.y.toFixed(1)} is inside ${String(WIDTH)} x ${String(HEIGHT)}`,
        );
    });
});
