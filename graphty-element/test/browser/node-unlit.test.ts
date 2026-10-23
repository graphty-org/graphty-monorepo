/**
 * @file `node.unlit` draws a 3D node in its own colour with no light, as 2D draws every node.
 *
 * Paints one sphere unlit and one lit through style layers and reads the material of the source
 * mesh each node is drawn through.
 */

import { type InstancedMesh, StandardMaterial } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

describe("node.unlit", () => {
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

        await graph.addNodes([{ id: "unlit" }, { id: "lit" }]);
        await graph.setLayout("circular", { scale: 0.2 });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The material of the source mesh a node is drawn through.
     * @param id - The node.
     * @returns Its material.
     */
    function materialOf(id: string): StandardMaterial {
        const node = graph.getDataManager().getNode(id);
        assert.isDefined(node, `node ${id} exists`);
        const { material } = (node.mesh as InstancedMesh).sourceMesh;
        assert.instanceOf(material, StandardMaterial);
        return material;
    }

    it("draws an unlit node with no light and leaves a lit one lit", async () => {
        const layer = await session.styles.add({
            name: "unlit",
            target: "node",
            selector: { match: "ids", nodes: ["unlit"] },
            set: { "node.unlit": true },
        });
        await graph.waitForStableFrame();

        assert.isTrue(materialOf("unlit").disableLighting, "the unlit node takes no light");
        assert.isFalse(materialOf("lit").disableLighting, "the other node is still lit");

        // Taking the layer away puts the node back on the lit source mesh.
        await session.styles.remove(layer.id);
        await graph.waitForStableFrame();
        assert.isFalse(materialOf("unlit").disableLighting);
    });
});
