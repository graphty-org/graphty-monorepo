import { Quaternion, StandardMaterial } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { Graph } from "../../src/Graph";
import { asData, edgeBetween, styleEveryEdge } from "../helpers/testSetup";

describe("Edge 2D Arrows Integration", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    test("Arrow head uses 2D material in 2D mode with diamond type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        // The arrow's own colour is not a channel: `edge.arrowHead` chooses WHICH arrow is drawn
        // and the rest of its appearance follows the line. What these tests are about is the
        // material an arrow is built with, which the type decides.
        await styleEveryEdge(graph, {
            "edge.color": "#666666",
            "edge.width": 0.05,
            "edge.arrowHead": "diamond",
        });
        await graph.operationQueue.waitForCompletion();

        // Add nodes
        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));

        // Add edge with source and target path parameters
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        // Wait for all operations to complete
        await graph.operationQueue.waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // Get the edge from dataManager
        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist in dataManager");

        // Verify arrow head exists
        assert(edge.arrowMesh, "Arrow head should exist");

        // Verify arrow head uses StandardMaterial
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Arrow head should use StandardMaterial in 2D mode",
        );

        // Verify arrow head is marked as 2D
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow head should be marked as 2D");

        // Verify rotation to XY plane. The turn is no longer a property of a mesh: a cap is a
        // slot in a shared batch, and the quarter turn that lifts its geometry into the XY plane
        // is composed into that slot's matrix by the edge's own placement -- so the reading is
        // taken after asking the edge to draw itself, which is a stricter check than the one it
        // replaces: that one read a property set when the mesh was built and would have passed
        // on an edge that never placed its cap at all.
        //
        // The two ends are moved apart by hand first. The layout has not run at this point, so
        // both nodes still sit at the origin, and an edge whose ends coincide draws no cap --
        // which is the same reason `edge-arrowhead-position.test.ts` pulls node positions out of
        // the layout engine before it reads an arrow.
        edge.srcNode.mesh.position.set(0, 0, 0);
        edge.dstNode.mesh.position.set(4, 0, 0);
        edge.invalidatePositionCache();
        edge.update();

        const turn = new Quaternion();
        edge.arrowMesh.transform.decompose(undefined, turn, undefined);
        const euler = turn.toEulerAngles();
        assert.closeTo(euler.x, Math.PI / 2, 1e-6, "Arrow head should be rotated to XY plane");

        // AND THE TURN THE GRAPHICS CARD ACTUALLY USES, which is the slot's matrix multiplied by
        // the batch mesh's own. Reading the slot alone is not enough: the batch mesh is shared by
        // every cap of this appearance, so a turn left on it is applied to all of them a second
        // time. One was -- `MaterialHelper.apply2DMaterial` stands the geometry up in the XY
        // plane by turning the mesh it is handed, which was that cap when a cap was a mesh and is
        // the shared carrier now. The two quarter turns summed to a half turn, which laid all
        // thirteen 2D cap shapes back down edge-on to the camera: placed, enabled, drawn, and
        // covering almost no pixels. Composed, the turn must still be the quarter turn above.
        const { batchMesh } = edge.arrowMesh;
        assert(batchMesh, "A 2D cap is drawn by a batch mesh");
        const drawn = edge.arrowMesh.transform.multiply(batchMesh.computeWorldMatrix(true));
        const drawnTurn = new Quaternion();
        drawn.decompose(undefined, drawnTurn, undefined);
        assert.closeTo(
            drawnTurn.toEulerAngles().x,
            Math.PI / 2,
            1e-6,
            "The cap as drawn should stand in the XY plane, not be turned again by its batch",
        );

        // Cleanup
        graph.dispose();
    });

    test("Arrow head uses 2D material in 2D mode with normal type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.arrowHead": "normal" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Normal arrow should use StandardMaterial in 2D mode",
        );
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow should be marked as 2D");

        graph.dispose();
    });

    test("Arrow head uses 2D material in 2D mode with box type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.arrowHead": "box" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Box arrow should use StandardMaterial in 2D mode",
        );
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow should be marked as 2D");

        graph.dispose();
    });

    test("Arrow head uses 2D material in 2D mode with dot type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.arrowHead": "dot" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Dot arrow should use StandardMaterial in 2D mode",
        );
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow should be marked as 2D");

        graph.dispose();
    });

    test("Arrow head uses 2D material in 2D mode with vee type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.arrowHead": "vee" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Vee arrow should use StandardMaterial in 2D mode",
        );
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow should be marked as 2D");

        graph.dispose();
    });

    test("Arrow head uses 2D material in 2D mode with tee type", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.arrowHead": "tee" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");
        assert(
            edge.arrowMesh.batchMesh?.material instanceof StandardMaterial,
            "Tee arrow should use StandardMaterial in 2D mode",
        );
        assert.strictEqual(edge.arrowMesh.is2D, true, "Arrow should be marked as 2D");

        graph.dispose();
    });

    test("Arrow head uses 3D shader in 3D mode", async () => {
        const graph = new Graph(container);

        await graph.setViewMode("3d");
        await styleEveryEdge(graph, { "edge.arrowHead": "diamond" });
        await graph.operationQueue.waitForCompletion();

        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));
        await graph.addEdge(asData({ id: "edge1", source: "node1", target: "node2" }), {
            source: "source",
            target: "target",
        });

        await graph.operationQueue.waitForCompletion();

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert(edge.arrowMesh, "Arrow head should exist");

        // Verify arrow head does NOT use StandardMaterial in 3D mode
        assert(
            !(edge.arrowMesh.batchMesh?.material instanceof StandardMaterial),
            "Arrow head should NOT use StandardMaterial in 3D mode",
        );

        // Verify arrow head is NOT marked as 2D
        assert(!edge.arrowMesh.is2D, "Arrow head should NOT be marked as 2D in 3D mode");

        graph.dispose();
    });
});
