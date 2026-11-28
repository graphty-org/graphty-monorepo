/**
 * @file A node's halo is the node's own shape scaled `node.haloScale` about its center, whatever
 * `node.sizeSpace` the node is drawn in (issue #10404). Under "screen" the node mesh is shrunk to its
 * size on screen every frame, and the halo has to shrink with it: it used to keep the scale it was
 * built at, a slab several times the node's size behind it.
 *
 * Measured on mesh geometry: the halo's world bounding box over the node's, which is the same with
 * and without a size space.
 */

import type { AbstractMesh } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";

/** How far the halo-to-node width ratio may differ between the two size spaces. */
const TOLERANCE = 0.05;

describe("a halo under node.sizeSpace", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }]);
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "ring",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.shape": "box", "node.haloColor": "#FFBE00", "node.haloOpacity": 1, "node.haloScale": 1.45 },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The halo's world width over the node's, and the node's drawn scale.
     * @returns The ratio and the scale.
     */
    async function haloOverNode(): Promise<{ ratio: number; scale: number }> {
        await graph.waitForStableFrame();
        const node = graph.getNode("a");
        assert.isDefined(node);
        const body = node.mesh;
        await graph.waitForStableFrame();
        const { halo } = nodeInternals.drawn(node);
        assert.isNotNull(halo, "the halo is built");
        assert.isTrue(halo.isEnabled(), "the halo is drawn");
        const width = (m: AbstractMesh): number => {
            m.computeWorldMatrix(true);
            const box = m.getBoundingInfo().boundingBox;
            return box.maximumWorld.x - box.minimumWorld.x;
        };
        return { ratio: width(halo) / width(body), scale: node.drawnScale };
    }

    it("keeps the halo the same size against its node under screen sizing", async () => {
        const scene = await haloOverNode();
        await graph.getSession().styles.add({
            name: "screen",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.sizeSpace": "screen" },
        });
        await operationQueueOf(graph).waitForCompletion();
        const screen = await haloOverNode();
        assert.isBelow(screen.scale, 0.95, "screen sizing changed the node's drawn scale");
        assert.closeTo(screen.ratio, scene.ratio, TOLERANCE, "the halo stays haloScale times its node");
    });
});
