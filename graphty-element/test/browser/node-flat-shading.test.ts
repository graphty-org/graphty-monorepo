/**
 * @file `node.flat` draws faceted geometry.
 *
 * The channel used to be accepted, interned into its own source mesh and read by nothing, so a
 * flat sphere drew exactly like a smooth one (#2069). Flat shading means one normal per triangle:
 * every face is lit as a single plane. This file paints one sphere flat and one smooth through
 * style layers and reads the normals of the source mesh each node is drawn through.
 */

import { type InstancedMesh, type Mesh, VertexBuffer } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

describe("node.flat", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes([{ id: "flat" }, { id: "smooth" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await session.styles.add({
            name: "spheres",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "sphere" },
        });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The source mesh a node is drawn through.
     * @param id - The node.
     * @returns Its source mesh.
     */
    function sourceOf(id: string): Mesh {
        const node = graph.getDataManager().getNode(id);
        assert.isDefined(node, `node ${id} exists`);

        return (node.mesh as InstancedMesh).sourceMesh;
    }

    /**
     * How many triangles of a mesh carry the same normal at all three corners.
     * @param mesh - The mesh to read.
     * @returns The faceted triangles and the total.
     */
    function facetedTriangles(mesh: Mesh): { faceted: number; total: number } {
        const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
        const indices = mesh.getIndices();
        assert.isNotNull(normals);
        assert.isNotNull(indices);
        let faceted = 0;

        for (let at = 0; at < indices.length; at += 3) {
            const [a, b, c] = [indices[at] * 3, indices[at + 1] * 3, indices[at + 2] * 3];
            let same = true;

            for (let axis = 0; axis < 3; axis++) {
                const n = normals[a + axis];
                same &&= Math.abs(n - normals[b + axis]) < 1e-6 && Math.abs(n - normals[c + axis]) < 1e-6;
            }

            if (same) {
                faceted++;
            }
        }

        return { faceted, total: indices.length / 3 };
    }

    it("gives a flat sphere one normal per triangle and leaves a smooth one smooth", async () => {
        const layer = await session.styles.add({
            name: "flat",
            target: "node",
            selector: { match: "ids", nodes: ["flat"] },
            set: { "node.flat": true },
        });
        await graph.waitForStableFrame();

        const flat = facetedTriangles(sourceOf("flat"));
        const smooth = facetedTriangles(sourceOf("smooth"));

        assert.isAbove(flat.total, 0);
        assert.strictEqual(flat.faceted, flat.total, "every triangle of the flat sphere is one plane");
        assert.isBelow(smooth.faceted, smooth.total / 2, "the smooth sphere keeps its interpolated normals");

        // Taking the layer away puts the node back on the smooth sphere's source mesh.
        await session.styles.remove(layer.id);
        await graph.waitForStableFrame();
        assert.strictEqual(sourceOf("flat").uniqueId, sourceOf("smooth").uniqueId);
    });
});
