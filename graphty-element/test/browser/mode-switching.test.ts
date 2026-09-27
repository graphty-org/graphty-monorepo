/**
 * 2D/3D Mode Switching Regression Tests
 *
 * Tests for Z-coordinate flattening when switching from 3D to 2D mode,
 * and Z-coordinate restoration when switching back to 3D mode.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

describe("2D/3D Mode Switching", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    const TEST_NODES = [
        { id: 1, name: "Node 1" },
        { id: 2, name: "Node 2" },
        { id: 3, name: "Node 3" },
    ];

    const TEST_EDGES = [
        { id: "e1", source: 1, target: 2 },
        { id: "e2", source: 2, target: 3 },
    ];

    /**
     * Every node's Z as drawn, synced from the position array first.
     * @returns Z by node id.
     */
    function zOf(): Map<string | number, number> {
        for (const node of graph.getNodes()) {
            node.update();
        }

        return new Map(graph.getNodes().map((node) => [node.id, node.mesh.position.z]));
    }

    function delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "400px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        document.body.removeChild(container);
    });

    describe("Z-Flattening on 2D Switch", () => {
        it("should flatten Z positions to 0 when switching from 3D to 2D", async () => {
            // Setup in 3D mode
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Verify we're in 3D mode with potential non-zero Z positions
            assert.isFalse(graph.getViewMode() === "2d", "Should start in 3D mode");

            // Switch to 2D mode
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are flattened
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode after switch");
            for (const node of graph.getNodes()) {
                assert.closeTo(
                    node.mesh.position.z,
                    0,
                    0.01,
                    `Node ${node.id} Z position should be ~0 in 2D mode, got ${node.mesh.position.z}`,
                );
            }
        });

        it("should flatten Z positions even for force-directed 3D layouts", async () => {
            // Setup with ngraph (force-directed 3D)
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("ngraph");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Wait for layout to settle
            await delay(500);

            // Store original 3D Z positions (may be non-zero)
            // The mesh positions are synced from the layout engine on the frame loop, so they
            // are asked for explicitly here: a Z read before the sync is 0, and a test that
            // recorded 0 as the "original" would pass whether or not it was ever restored.
            for (const node of graph.getNodes()) {
                node.update();
            }

            const originalZPositions = new Map<string | number, number>();
            for (const node of graph.getNodes()) {
                originalZPositions.set(node.id, node.mesh.position.z);
            }

            // Switch to 2D mode
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are flattened regardless of original values
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01, `Node ${node.id} Z position should be ~0 in 2D mode`);
            }
        });
    });

    describe("Z-Restoration on 3D Switch", () => {
        it("should restore Z positions when switching from 2D back to 3D", async () => {
            // Setup in 3D mode
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Store original 3D Z positions
            // The mesh positions are synced from the layout engine on the frame loop, so they
            // are asked for explicitly here: a Z read before the sync is 0, and a test that
            // recorded 0 as the "original" would pass whether or not it was ever restored.
            for (const node of graph.getNodes()) {
                node.update();
            }

            const originalZPositions = new Map<string | number, number>();
            for (const node of graph.getNodes()) {
                originalZPositions.set(node.id, node.mesh.position.z);
            }

            // Switch to 2D mode
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify flattened
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01, "Should be flattened in 2D");
            }

            // Switch back to 3D mode
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are restored
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode after restoration");
            for (const node of graph.getNodes()) {
                const originalZ = originalZPositions.get(node.id);
                assert.isDefined(originalZ, `Should have original Z for node ${node.id}`);
                assert.closeTo(
                    node.mesh.position.z,
                    originalZ,
                    0.01,
                    `Node ${node.id} Z position should be restored to ${originalZ}`,
                );
            }
        });

        it("gives a graph opened in 2D a third dimension in 3D, and undo flattens it again", async () => {
            // A switch to 3D lays the graph out in three dimensions: the Z a node had before it
            // was flat is not kept anywhere but in history, which undo reads.
            await graph.setViewMode("2d");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.operationQueue.waitForCompletion();

            assert.isTrue(graph.getViewMode() === "2d", "Should start in 2D mode");
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01, "Should have Z=0 in 2D mode");
            }

            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");
            assert.isTrue(
                [...zOf().values()].some((z) => Math.abs(z) > 0.01),
                "the 3D layout places nodes off the plane",
            );

            await graph.getSession().undo();
            assert.isTrue(graph.getViewMode() === "2d", "undo returns to 2D");
            for (const [id, z] of zOf()) {
                assert.closeTo(z, 0, 0.01, `Node ${id} is flat again`);
            }
        });
    });
    describe("Multiple Mode Switches (Round-Trip)", () => {
        it("undo of a switch to 2D puts back every Z the force layout had", async () => {
            // Setup in 3D mode with force-directed layout
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("ngraph");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();
            await delay(500); // Let layout settle
            graph.setRunning(false);

            const original = zOf();

            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();
            for (const [id, z] of zOf()) {
                assert.closeTo(z, 0, 0.01, `Node ${id} is flat in 2D`);
            }

            // The switch to 2D kept where every node was when it began, so undo restores it
            // exactly -- a force layout would not arrive at the same place twice.
            await graph.getSession().undo();
            for (const [id, z] of zOf()) {
                const originalZ = original.get(id);
                assert.isDefined(originalZ, `Should have original Z for node ${id}`);
                assert.closeTo(z, originalZ, 0.01, `Node ${id} Z should be restored by undo`);
            }
        });

        it("should handle multiple round-trips correctly", { timeout: 45000 }, async () => {
            // Setup in 3D mode
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Store original 3D Z positions
            // The mesh positions are synced from the layout engine on the frame loop, so they
            // are asked for explicitly here: a Z read before the sync is 0, and a test that
            // recorded 0 as the "original" would pass whether or not it was ever restored.
            for (const node of graph.getNodes()) {
                node.update();
            }

            const originalZPositions = new Map<string | number, number>();
            for (const node of graph.getNodes()) {
                originalZPositions.set(node.id, node.mesh.position.z);
            }

            // Multiple round trips
            for (let i = 0; i < 3; i++) {
                // To 2D
                await graph.setViewMode("2d");
                await graph.operationQueue.waitForCompletion();

                // Verify flattened
                for (const node of graph.getNodes()) {
                    assert.closeTo(
                        node.mesh.position.z,
                        0,
                        0.01,
                        `Round ${i + 1}: Node ${node.id} should be flattened in 2D`,
                    );
                }

                // Back to 3D
                await graph.setViewMode("3d");
                await graph.operationQueue.waitForCompletion();

                // Verify restored
                for (const node of graph.getNodes()) {
                    const originalZ = originalZPositions.get(node.id);
                    if (originalZ === undefined) {
                        assert.fail(`Should have original Z for node ${node.id}`);
                    }

                    assert.closeTo(
                        node.mesh.position.z,
                        originalZ,
                        0.01,
                        `Round ${i + 1}: Node ${node.id} Z should be restored`,
                    );
                }
            }
        });

        it("should handle 2D → 3D → 2D round-trip", async () => {
            // Setup directly in 2D mode
            await graph.setViewMode("2d");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.operationQueue.waitForCompletion();

            // Verify all nodes have Z=0
            assert.isTrue(graph.getViewMode() === "2d", "Should start in 2D mode");
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01);
            }

            // Switch to 3D
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

            // Switch back to 2D
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Z should remain 0
            assert.isTrue(graph.getViewMode() === "2d", "Should be back in 2D mode");
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01, `Node ${node.id} Z should remain 0 in 2D`);
            }
        });
    });

    describe("Edge Cases", () => {
        it("should handle rapid consecutive mode switches", { timeout: 30000 }, async () => {
            // Setup
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setLayout("circular");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Store original Z positions
            // The mesh positions are synced from the layout engine on the frame loop, so they
            // are asked for explicitly here: a Z read before the sync is 0, and a test that
            // recorded 0 as the "original" would pass whether or not it was ever restored.
            for (const node of graph.getNodes()) {
                node.update();
            }

            const originalZPositions = new Map<string | number, number>();
            for (const node of graph.getNodes()) {
                originalZPositions.set(node.id, node.mesh.position.z);
            }

            // Rapid switches without waiting
            void graph.setViewMode("2d");
            await delay(10);
            void graph.setViewMode("3d");
            await delay(10);
            void graph.setViewMode("2d");
            await delay(10);
            void graph.setViewMode("3d");

            // Wait for all to complete
            await graph.operationQueue.waitForCompletion();

            // Final state should be 3D with restored Z positions
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode after rapid switches");
            for (const node of graph.getNodes()) {
                const originalZ = originalZPositions.get(node.id);
                if (originalZ === undefined) {
                    assert.fail(`Should have original Z for node ${node.id}`);
                }

                assert.closeTo(
                    node.mesh.position.z,
                    originalZ,
                    0.01,
                    `Node ${node.id} Z should be restored after rapid switches`,
                );
            }
        });

        it("should handle empty graph mode switches", async () => {
            // Setup empty graph in 3D mode
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Switch to 2D (no nodes to flatten)
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode");
            assert.equal(graph.getNodeCount(), 0, "Should have no nodes");

            // Add nodes in 2D mode
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.operationQueue.waitForCompletion();

            // Nodes added in 2D should have Z=0
            for (const node of graph.getNodes()) {
                assert.closeTo(node.mesh.position.z, 0, 0.01, `Node ${node.id} added in 2D should have Z=0`);
            }

            // Switch back to 3D, and undo it
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

            await graph.getSession().undo();
            assert.isTrue(graph.getViewMode() === "2d", "undo returns to 2D");
            for (const [id, z] of zOf()) {
                assert.closeTo(z, 0, 0.01, `Node ${id} is flat again`);
            }
        });

        it("should handle nodes added after mode switch", async () => {
            // Setup in 3D mode with initial nodes
            await graph.addNodes([{ id: 1, name: "Initial" }]);
            await graph.setLayout("circular");
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Store original Z for initial node
            const initialNodeZ = zOf().get(1) ?? Number.NaN;

            // Switch to 2D
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify initial node is flattened
            assert.closeTo(graph.getNodes()[0].mesh.position.z, 0, 0.01);

            // Add more nodes in 2D mode
            await graph.addNodes([{ id: 2, name: "Added in 2D" }]);
            await graph.operationQueue.waitForCompletion();

            // New node should have Z=0
            const newNode = graph.getNodes().find((n) => n.id === 2);
            if (!newNode) {
                assert.fail("Should find new node");
            }

            assert.closeTo(newNode.mesh.position.z, 0, 0.01);

            // Undo the node added in 2D and the switch to 2D: the initial node is back where it
            // was in 3D, and the node added since is gone with its step.
            await graph.getSession().undo();
            await graph.getSession().undo();
            assert.isFalse(graph.getViewMode() === "2d", "Should be back in 3D mode");
            assert.isUndefined(
                graph.getNodes().find((n) => n.id === 2),
                "the node added in 2D is gone",
            );
            assert.closeTo(zOf().get(1) ?? Number.NaN, initialNodeZ, 0.01, "Initial node Z should be restored");
        });
    });
});
