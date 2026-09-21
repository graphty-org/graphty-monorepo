import { StandardMaterial } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { Graph } from "../../src/Graph";
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
        await graph.operationQueue.waitForCompletion();

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
        await graph.operationQueue.waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().renderFixedFrames(2);

        // Get the edge from dataManager
        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist in dataManager");

        // Verify edge mesh is a PatternedLineMesh
        assert("meshes" in edge.mesh, "Edge mesh should be a PatternedLineMesh with meshes property");
        const patternMesh = edge.mesh as unknown as PatternedLineMesh;

        // Verify pattern meshes use StandardMaterial in 2D mode
        assert(patternMesh.meshes.length > 0, "PatternedLineMesh should have at least one mesh");
        for (const mesh of patternMesh.meshes) {
            assert(mesh.material instanceof StandardMaterial, "Pattern mesh should use StandardMaterial in 2D mode");
            assert.strictEqual(mesh.metadata?.is2D, true, "Pattern mesh should have is2D metadata");
        }

        // Cleanup
        graph.dispose();
    });

    test("Patterned edge uses 3D materials in 3D mode", async () => {
        const graph = new Graph(container);

        // Set 3D mode via style template with diamond pattern
        await graph.setViewMode("3d");
        await styleEveryEdge(graph, { "edge.style": "diamond", "edge.color": "darkgrey" });
        await graph.operationQueue.waitForCompletion();

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
        await graph.operationQueue.waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().renderFixedFrames(2);

        // Get the edge from dataManager
        const edge = edgeBetween(graph, "node1", "node2");
        assert(edge, "Edge should exist in dataManager");

        // Verify edge mesh is a PatternedLineMesh
        assert("meshes" in edge.mesh, "Edge mesh should be a PatternedLineMesh with meshes property");
        const patternMesh = edge.mesh as unknown as PatternedLineMesh;

        // Verify pattern meshes do NOT use StandardMaterial in 3D mode (use ShaderMaterial)
        assert(patternMesh.meshes.length > 0, "PatternedLineMesh should have at least one mesh");
        for (const mesh of patternMesh.meshes) {
            assert(
                !(mesh.material instanceof StandardMaterial),
                "Pattern mesh should NOT use StandardMaterial in 3D mode",
            );
            assert.strictEqual(mesh.metadata?.is2D, undefined, "Pattern mesh should NOT have is2D metadata in 3D mode");
        }

        // Cleanup
        graph.dispose();
    });

    test("Multiple pattern types work in 2D mode", async () => {
        const graph = new Graph(container);

        // Set 2D mode via style template
        await graph.setViewMode("2d");
        await graph.operationQueue.waitForCompletion();

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

            await graph.operationQueue.waitForCompletion();
        }

        // Wait for all operations to complete
        await graph.operationQueue.waitForCompletion();

        // Wait for graph to settle
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        // A style pass works out what each element should look like; a FRAME is what applies it.
        // This graph was never `init()`ed, so nothing is driving the render loop and the frame
        // has to be driven by hand.
        graph.getUpdateManager().renderFixedFrames(2);

        // Verify all pattern types use 2D materials
        for (const [index, pattern] of patterns.entries()) {
            const nodeId1 = `node${index * 2}`;
            const nodeId2 = `node${index * 2 + 1}`;
            const edgeId = `${nodeId1} -> ${nodeId2}`;

            const edge = edgeBetween(graph, nodeId1, nodeId2);
            assert(edge, `Edge ${edgeId} should exist`);

            assert("meshes" in edge.mesh, `Edge ${edgeId} should be a PatternedLineMesh with meshes property`);
            const patternMesh = edge.mesh as unknown as PatternedLineMesh;
            assert(patternMesh.meshes.length > 0, `Edge ${edgeId} should have at least one mesh`);

            for (const mesh of patternMesh.meshes) {
                assert(
                    mesh.material instanceof StandardMaterial,
                    `Pattern ${pattern} should use StandardMaterial in 2D mode`,
                );
            }
        }

        // Cleanup
        graph.dispose();
    });
});
