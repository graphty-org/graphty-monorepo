/**
 * @file Issue #2070: a capsule and a torus are drawn at the node's size, like every other shape.
 *
 * Both used to be built from Babylon's defaults, so `node.size` changed nothing. The convention is
 * the one every other shape follows: every dimension is linear in size, and size 1 draws the
 * reference shape (a capsule 1 tall and 0.5 wide, a torus whose ring is 1 across and 0.5 thick).
 * Read off the drawn meshes, so a size the style model holds and the renderer ignores is caught.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

describe("capsule and torus nodes are drawn at node.size", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();
        await graph.addNodes([{ id: "n" }]);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Draw node "n" as the given shape and size, and read the half-extents of its drawn mesh.
     * @param shape - The node shape to draw
     * @param size - The node size
     * @returns Half the world-space bounding box along x, y and z
     */
    async function drawnHalfExtents(shape: "capsule" | "torus", size: number): Promise<[number, number, number]> {
        await session.styles.add({
            name: `${shape}-${size}`,
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": shape, "node.size": size },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const [node] = graph.getNodes();
        node.mesh.computeWorldMatrix(true);
        const { x, y, z } = node.mesh.getBoundingInfo().boundingBox.extendSizeWorld;

        return [x, y, z];
    }

    for (const size of [1, 3]) {
        it(`draws a capsule ${size} tall and ${size / 2} wide at size ${size}`, async () => {
            const [x, y, z] = await drawnHalfExtents("capsule", size);

            assert.closeTo(y, size / 2, 1e-3, "half the height is half the size");
            assert.closeTo(x, size / 4, 1e-3, "the radius is a quarter of the size");
            assert.closeTo(z, size / 4, 1e-3, "the radius is a quarter of the size");
        });

        it(`draws a torus ${1.5 * size} across at size ${size}`, async () => {
            const [x, y, z] = await drawnHalfExtents("torus", size);

            assert.closeTo(x, 0.75 * size, 1e-3, "ring diameter = size, tube thickness = size / 2");
            assert.closeTo(z, 0.75 * size, 1e-3, "ring diameter = size, tube thickness = size / 2");
            assert.closeTo(y, size / 4, 1e-3, "half the tube thickness");
        });
    }
});
