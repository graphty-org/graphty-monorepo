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

describe("a halo round a border drawn in screen pixels", () => {
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
            set: {
                "node.shape": "box",
                "node.borderScreenWidth": 6,
                "node.borderColor": "#202020",
                "node.haloColor": "#FFBE00",
                "node.haloOpacity": 1,
                "node.haloScale": 1.45,
            },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    const halfWidth = (mesh: AbstractMesh): number => {
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        return (box.maximumWorld.x - box.minimumWorld.x) / 2;
    };

    /**
     * How far the halo ends from where it should: haloScale's share of the fill past the fill, and the border's
     * drawn width past that, in units of the fill's half-width.
     * @returns The miss, and the border's drawn width past the fill.
     */
    async function haloMiss(): Promise<{ miss: number; ring: number }> {
        await graph.waitForStableFrame();
        const node = graph.getNode("a");
        assert.isDefined(node);
        const { halo, border } = nodeInternals.drawn(node);
        assert.isNotNull(halo, "the halo is built");
        assert.isNotNull(border, "the border is built");
        const fill = halfWidth(node.mesh);
        const ring = halfWidth(border) - fill;
        return { miss: (halfWidth(halo) - (1.45 * fill + ring)) / fill, ring };
    }

    it("grows the halo with the border when a zoom rebuilds the border wider", async () => {
        await graph.setCameraState({ position: { x: 0, y: 0, z: 20 }, target: { x: 0, y: 0, z: 0 } });
        const near = await haloMiss();
        assert.closeTo(near.miss, 0, 0.01, "the halo is built round the border");
        // further away, six pixels are more of the scene: the border is rebuilt wider
        await graph.setCameraState({ position: { x: 0, y: 0, z: 80 }, target: { x: 0, y: 0, z: 0 } });
        const far = await haloMiss();
        assert.isAbove(far.ring, near.ring * 2, "the zoom rebuilt the border wider");
        assert.closeTo(far.miss, 0, 0.01, "the halo follows the rebuilt border");
    });
});
