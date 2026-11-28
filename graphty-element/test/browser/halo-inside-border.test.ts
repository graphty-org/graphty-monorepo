/**
 * @file A node's halo reaches `node.haloScale` past the node's outline wherever its border sits (issue #10435). An
 * inside or centered border draws the node's fill in from its outline, and the halo, grown from that fill, used to
 * end in a thin band just past the border instead.
 *
 * Measured on mesh geometry: the halo's world half-height on a node with an inside border, against the same node's
 * halo with no border at all, whose outline is its fill.
 *
 * A vee under an inside border almost as wide as itself has its fill drawn in to a sliver well below its middle; a
 * halo grown from that sliver was stretched hundreds of times about the node's center and thrown far off the node.
 */

import { type AbstractMesh, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";

/** The look every node is drawn in: a wide node with a halo. */
const LOOK = {
    "node.width": 1.6,
    "node.height": 1,
    "node.haloColor": "#FFBE00",
    "node.haloOpacity": 1,
    "node.haloScale": 1.45,
};

/** A solid and a flat shape: both grow their halo through the same path. */
const SHAPES = ["cylinder", "rectangle"] as const;

describe("a halo round a node with an inside border", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([
            ...SHAPES.flatMap((shape, row) =>
                ["plain", "inside", "center"].map((position, k) => ({
                    id: `${shape}-${position}`,
                    x: (k - 1) * 3,
                    y: row * 3,
                    z: 0,
                })),
            ),
            { id: "vee-plain", x: -3, y: 6, z: 0 },
            { id: "vee-deep", x: 3, y: 6, z: 0 },
        ]);
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        const { styles } = graph.getSession();
        await styles.add({ name: "look", target: "node", selector: { match: "everything" }, set: LOOK });
        for (const shape of SHAPES) {
            await styles.add({
                name: shape,
                target: "node",
                selector: { match: "ids", nodes: ["plain", "inside", "center"].map((p) => `${shape}-${p}`) },
                set: { "node.shape": shape },
            });
        }
        for (const position of ["inside", "center"]) {
            await styles.add({
                name: position,
                target: "node",
                selector: { match: "ids", nodes: SHAPES.map((shape) => `${shape}-${position}`) },
                set: { "node.borderWidth": 0.3, "node.borderPosition": position, "node.borderColor": "#78C800" },
            });
        }
        await styles.add({
            name: "vee",
            target: "node",
            selector: { match: "ids", nodes: ["vee-plain", "vee-deep"] },
            set: { "node.shape": "vee" },
        });
        // an inside border wider than the vee draws its fill in by half its height, to almost nothing
        await styles.add({
            name: "deep",
            target: "node",
            selector: { match: "ids", nodes: ["vee-deep"] },
            set: { "node.borderWidth": 2, "node.borderPosition": "inside", "node.borderColor": "#78C800" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How far a node's halo reaches up and across from its center, in world units.
     * @param id - The node.
     * @returns The half-height and half-width.
     */
    function haloHalf(id: string): { x: number; y: number } {
        const node = graph.getNode(id);
        assert.isDefined(node);
        const { halo } = nodeInternals.drawn(node);
        assert.isNotNull(halo, `${id}'s halo is built`);
        assert.isTrue(halo.isEnabled(), `${id}'s halo is drawn`);
        const m: AbstractMesh = halo;
        m.computeWorldMatrix(true);
        const box = m.getBoundingInfo().boundingBox;
        return {
            x: (box.maximumWorld.x - box.minimumWorld.x) / 2,
            y: (box.maximumWorld.y - box.minimumWorld.y) / 2,
        };
    }

    /**
     * Where a node's halo's vertices are drawn, from the node's center, in world units.
     * @param id - The node.
     * @returns The points.
     */
    function haloPoints(id: string): Vector3[] {
        const node = graph.getNode(id);
        assert.isDefined(node);
        const { halo } = nodeInternals.drawn(node);
        assert.isNotNull(halo, `${id}'s halo is built`);
        const world = halo.computeWorldMatrix(true);
        const at = node.mesh.getAbsolutePosition();
        const positions = halo.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const points: Vector3[] = [];
        for (let i = 0; i + 2 < positions.length; i += 3) {
            const p = Vector3.TransformCoordinates(
                new Vector3(positions[i], positions[i + 1], positions[i + 2]),
                world,
            );
            points.push(p.subtract(at));
        }
        return points;
    }

    /**
     * How far the furthest of one set of points is from the nearest of another.
     * @param from - The points measured.
     * @param to - The points measured against.
     * @returns The distance.
     */
    function furthest(from: Vector3[], to: Vector3[]): number {
        return Math.max(...from.map((p) => Math.min(...to.map((q) => Vector3.Distance(p, q)))));
    }

    it("on a vee whose inside border draws its fill in to almost nothing stays round the node", () => {
        const plain = haloPoints("vee-plain");
        const deep = haloPoints("vee-deep");
        assert.isAbove(deep.length, 0, "the halo has vertices");
        // the inside border is drawn within the outline: the halo is the plain vee's, about its own node
        assert.isBelow(furthest(deep, plain), 0.01, "every point of the halo lies on the plain vee's halo");
        assert.isBelow(furthest(plain, deep), 0.01, "the halo reaches every point of the plain vee's halo");
    });

    for (const shape of SHAPES) {
        for (const position of ["inside", "center"]) {
            it(`on a ${shape} with its border ${position} reaches as far as with no border`, () => {
                const plain = haloHalf(`${shape}-plain`);
                const bordered = haloHalf(`${shape}-${position}`);
                // the border is drawn within the outline (inside) or half past it (center): an inside border's halo
                // ends where a plain node's does, a centered one's no nearer
                const past = position === "inside" ? 0 : 0.3 * 1.5 * 0.5;
                assert.approximately(bordered.y, plain.y + past, 0.01, "half-height");
                assert.approximately(bordered.x, plain.x + past, 0.01, "half-width");
            });
        }
    }
});
