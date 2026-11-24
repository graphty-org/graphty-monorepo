/**
 * @file `screenToWorld` at a node's screen point answers a point on that node, on both render paths.
 *
 * On `renderPath: "batched"` a node with no `Node` object has no pickable mesh, so a bare Babylon
 * pick found nothing there and `screenToWorld` returned null over a drawn node (issue #9861). The
 * objects path, and the build before the row renderer, answer a point on the node's surface.
 *
 * The fixture keeps batched rows lazy: nodes only, no edges, added after the first frame, and on
 * batched it first asserts that a batch draws every node, so the case cannot quietly test object rows.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { nodePoint } from "../helpers/real-input";

const COLUMNS = 5;
const NODES = Array.from({ length: COLUMNS * COLUMNS }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % COLUMNS) * 3, y: Math.floor(i / COLUMNS) * 3, z: 0 },
}));

const mounted: Graphty[] = [];
afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * A 25-node grid on a fixed layout, settled.
 * @param renderPath - The render path.
 * @param dimension - The layout's dimension.
 * @returns The element.
 */
async function grid(renderPath: "objects" | "batched", dimension: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = renderPath;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.layout.setDimension(dimension);
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.waitForStableFrame();
    if (renderPath === "batched") {
        assert.equal(element.rowCounts.batchedNodes, NODES.length, `rows ${JSON.stringify(element.rowCounts)}`);
    }

    return element;
}

describe.each(["objects", "batched"] as const)("screenToWorld over a node (%s)", (renderPath) => {
    it.each(["2d", "3d"] as const)("answers a point on the node in %s", async (dimension) => {
        const element = await grid(renderPath, dimension);
        // n12 is at (6, 6): the point is on its surface, within its radius.
        const world = element.screenToWorld(nodePoint(element, "n12"));
        assert.isNotNull(world, "screenToWorld over a node");
        assert.approximately(world.x, 6, 1, JSON.stringify(world));
        assert.approximately(world.y, 6, 1, JSON.stringify(world));
    });

    it("answers null over empty background", async () => {
        const element = await grid(renderPath, "3d");
        const a = nodePoint(element, "n11");
        const b = nodePoint(element, "n12");
        assert.isNull(element.screenToWorld({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
    });
});
