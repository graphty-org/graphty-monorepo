import { StandardMaterial } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { addStyleLayer, asData, edgeBetween, styleEveryEdge } from "../helpers/testSetup";

describe("Edge 2D Patterns Integration", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    test("Patterned edge uses 2D materials in 2D mode", async () => {
        const graph = new Graph(container);

        // Set 2D mode via style template with diamond pattern
        await graph.setViewMode("2d");
        await styleEveryEdge(graph, { "edge.style": "diamond", "edge.color": "darkgrey" });
        await operationQueueOf(graph).waitForCompletion();

        // Add nodes
        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));

        // Add edge
        await graph.addEdge(
            asData({
                id: "edge1",
                source: "node1",
                target: "node2",
            }),
            { source: "source", target: "target" },
        );

        // Wait for all operations to complete
        await operationQueueOf(graph).waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().stepFrames(2);

        // Get the edge from dataManager
        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist in dataManager");

        // Verify edge mesh is a PatternedLineMesh
        assert("elements" in edge.mesh, "Edge mesh should be a PatternedLineMesh with elements property");
        const patternMesh = edge.mesh as unknown as PatternedLineMesh;

        // Verify pattern meshes use StandardMaterial in 2D mode
        assert(patternMesh.elements.length > 0, "PatternedLineMesh should have at least one mesh");
        for (const mesh of patternMesh.elements) {
            assert(
                mesh.batchMesh?.material instanceof StandardMaterial,
                "Pattern mesh should use StandardMaterial in 2D mode",
            );
            assert.strictEqual(mesh.batchMesh?.metadata?.is2D, true, "Pattern mesh should have is2D metadata");
        }

        // Cleanup
        graph.dispose();
    });

    test("Patterned edge uses 3D materials in 3D mode", async () => {
        const graph = new Graph(container);

        // Set 3D mode via style template with diamond pattern
        await graph.setViewMode("3d");
        await styleEveryEdge(graph, { "edge.style": "diamond", "edge.color": "darkgrey" });
        await operationQueueOf(graph).waitForCompletion();

        // Add nodes
        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 1, y: 0, z: 0 }));

        // Add edge
        await graph.addEdge(
            asData({
                id: "edge1",
                source: "node1",
                target: "node2",
            }),
            { source: "source", target: "target" },
        );

        // Wait for all operations to complete
        await operationQueueOf(graph).waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().stepFrames(2);

        // Get the edge from dataManager
        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist in dataManager");

        // Verify edge mesh is a PatternedLineMesh
        assert("elements" in edge.mesh, "Edge mesh should be a PatternedLineMesh with elements property");
        const patternMesh = edge.mesh as unknown as PatternedLineMesh;

        // Verify pattern meshes do NOT use StandardMaterial in 3D mode (use ShaderMaterial)
        assert(patternMesh.elements.length > 0, "PatternedLineMesh should have at least one mesh");
        for (const mesh of patternMesh.elements) {
            assert(
                !(mesh.batchMesh?.material instanceof StandardMaterial),
                "Pattern mesh should NOT use StandardMaterial in 3D mode",
            );
            assert.strictEqual(
                mesh.batchMesh?.metadata?.is2D,
                undefined,
                "Pattern mesh should NOT have is2D metadata in 3D mode",
            );
        }

        // Cleanup
        graph.dispose();
    });

    test("Multiple pattern types work in 2D mode", async () => {
        const graph = new Graph(container);

        // Set 2D mode via style template
        await graph.setViewMode("2d");
        await operationQueueOf(graph).waitForCompletion();

        // Test different pattern types
        const patterns = ["dot", "star", "diamond", "box", "dash"] as const;

        for (const [index, pattern] of patterns.entries()) {
            const nodeId1 = `node${index * 2}`;
            const nodeId2 = `node${index * 2 + 1}`;

            await graph.addNode(asData({ id: nodeId1, x: index, y: 0, z: 0 }));
            await graph.addNode(asData({ id: nodeId2, x: index + 1, y: 0, z: 0 }));

            // The edge FIRST, because the layer below names it by id and an edge's id is the
            // element's own -- there is nothing to name until the element has assigned one.
            await graph.addEdge(
                asData({
                    source: nodeId1,
                    target: nodeId2,
                }),
                { source: "source", target: "target" },
            );

            const added = edgeBetween(graph, nodeId1, nodeId2);
            assert(added, `Edge ${nodeId1} -> ${nodeId2} should exist`);

            // One layer per pattern, each scoped to the one edge it is about. A layer selecting
            // everything would leave every edge drawn in whichever pattern was added last, and
            // the check at the bottom would be five assertions about one pattern.
            await addStyleLayer(graph, {
                name: `${pattern} edge`,
                target: "edge",
                selector: { match: "ids", edges: [added.id] },
                set: { "edge.style": pattern, "edge.color": "darkgrey" },
            });

            await operationQueueOf(graph).waitForCompletion();
        }

        // Wait for all operations to complete
        await operationQueueOf(graph).waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().stepFrames(2);

        // Verify all pattern types use 2D materials
        for (const [index, pattern] of patterns.entries()) {
            const nodeId1 = `node${index * 2}`;
            const nodeId2 = `node${index * 2 + 1}`;
            const edgeId = `${nodeId1} -> ${nodeId2}`;

            const edge = edgeBetween(graph, nodeId1, nodeId2);
            assert(edge, `Edge ${edgeId} should exist`);

            assert("elements" in edge.mesh, `Edge ${edgeId} should be a PatternedLineMesh with elements property`);
            const patternMesh = edge.mesh as unknown as PatternedLineMesh;
            assert(patternMesh.elements.length > 0, `Edge ${edgeId} should have at least one mesh`);

            for (const mesh of patternMesh.elements) {
                assert(
                    mesh.batchMesh?.material instanceof StandardMaterial,
                    `Pattern ${pattern} should use StandardMaterial in 2D mode`,
                );
            }
        }

        // Cleanup
        graph.dispose();
    });

    // Switching the view mode disposes every patterned line and asks each edge to paint itself
    // again with the style it already has. A patterned line used to answer "not disposed" whatever
    // had happened to it, so an unchanged style skipped the rebuild -- and the next frame's update
    // then grew the disposed line a fresh run of 3D elements, billboarded in a 2D view.
    test("A patterned edge is drawn again, flat, after switching from 3D to 2D", async () => {
        const graph = new Graph(container);

        await styleEveryEdge(graph, { "edge.style": "dash", "edge.color": "darkgrey" });
        await graph.addNode(asData({ id: "node1", x: 0, y: 0, z: 0 }));
        await graph.addNode(asData({ id: "node2", x: 5, y: 0, z: 0 }));
        await graph.addEdge(asData({ source: "node1", target: "node2" }), { source: "source", target: "target" });
        await operationQueueOf(graph).waitForCompletion();
        graph.getUpdateManager().stepFrames(2);

        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist");
        assert.isAbove(edge.drawnPattern.length, 0, "the dashed line is drawn in 3D");

        await graph.setViewMode("2d");
        await operationQueueOf(graph).waitForCompletion();
        graph.getUpdateManager().stepFrames(2);

        assert.isAbove(edge.drawnPattern.length, 0, "the dashed line is drawn again in 2D");
        for (const element of edge.drawnPattern) {
            assert(element.batchMesh?.material instanceof StandardMaterial, "and drawn flat");
        }

        graph.dispose();
    });
});
