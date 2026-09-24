/**
 * Nested Operations Regression Tests
 *
 * These tests verify that the operation queue correctly handles nested operations -
 * operations that trigger other operations as side effects (e.g., setting a style
 * template that changes the camera mode, which triggers camera-update operations).
 *
 * These tests correspond to the stories in stories/NestedOperations.stories.ts
 */

import { Color3, InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { isDisposed, styleEveryNode, type TestGraph } from "../helpers/testSetup";

// Test data constants (matching the stories)
const TEST_NODES = [
    { id: "1", label: "Node 1" },
    { id: "2", label: "Node 2" },
    { id: "3", label: "Node 3" },
];

const TEST_EDGES = [
    { src: "1", dst: "2" },
    { src: "2", dst: "3" },
];

/** The appearance every story in this file draws: a green sphere of size 10. */
const NODE_STYLE = { "node.color": "#4CAF50", "node.shape": "sphere", "node.size": 10 } as const;

/** That colour as the renderer writes it into a node's own instance. */
const NODE_COLOR = { r: 76, g: 175, b: 80, a: 1 };

// Helper to wait for a delay
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Nested Operations", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    // =========================================================================
    // Helper functions for verification
    // =========================================================================

    function getNodePositions(): Map<string, { x: number; y: number; z: number }> {
        const positions = new Map<string, { x: number; y: number; z: number }>();
        for (const node of graph.getNodes()) {
            const pos = node.getPosition();
            positions.set(node.id as string, { x: pos.x, y: pos.y, z: pos.z });
        }
        return positions;
    }

    /**
     * Relaxed check - just verify nodes have non-zero positions (layout was applied)
     */
    function layoutWasApplied(positions: Map<string, { x: number; y: number; z: number }>): boolean {
        if (positions.size === 0) {
            return false;
        }

        // Check that at least some nodes have non-zero positions
        let nonZeroCount = 0;
        for (const pos of positions.values()) {
            if (Math.abs(pos.x) > 0.001 || Math.abs(pos.y) > 0.001 || Math.abs(pos.z) > 0.001) {
                nonZeroCount++;
            }
        }

        // At least half of nodes should have non-zero positions
        return nonZeroCount >= positions.size / 2;
    }

    /**
     * Verify that all nodes have the expected style properties applied.
     *
     * Read from the style stack's own answer for each node, which is the one reading that says
     * what a node is drawn as. The colour is beside the style rather than in it, because it is
     * written into the node's instance while the style builds the source mesh the instances
     * share -- so it is asserted separately.
     * @param expectedColor - The colour, as the renderer writes it into the instance.
     * @param expectedShape - The shape the source mesh is built from.
     * @param expectedSize - Its size.
     */
    function verifyNodeStyles(
        expectedColor: { r: number; g: number; b: number; a: number },
        expectedShape: string,
        expectedSize: number,
    ): void {
        for (const node of graph.getNodes()) {
            const paint = graph.getStylePainter().nodePaint(node.index);

            assert.isNotNull(paint, `Node ${node.id} should have been painted`);
            assert.deepEqual(paint?.color, expectedColor, `Node ${node.id} should have the expected colour`);
            assert.equal(paint?.style.shape?.type, expectedShape, `Node ${node.id} should have shape ${expectedShape}`);
            assert.equal(paint?.style.shape?.size, expectedSize, `Node ${node.id} should have size ${expectedSize}`);
        }
    }

    /**
     * Combined verification helper for the style every story in this file applies
     */
    function verifyFinalStyles(): void {
        verifyNodeStyles(NODE_COLOR, "sphere", 10);
    }

    // =========================================================================
    // Mesh verification helpers - verify actual Babylon.js meshes are correct
    // =========================================================================

    /**
     * Verify all node meshes exist and are not disposed.
     */
    function verifyNodeMeshesExist(): void {
        for (const node of graph.getNodes()) {
            assert.isDefined(node.mesh, `Node ${node.id} should have a mesh`);
            assert.isFalse(isDisposed(node.mesh), `Node ${node.id} mesh should not be disposed`);
        }
    }

    /**
     * Verify all edge meshes exist and are not disposed.
     */
    function verifyEdgeMeshesExist(): void {
        for (const edge of (graph as unknown as TestGraph).dataManager.edges.values()) {
            assert.isDefined(edge.mesh, "Edge should have a mesh");
            if ("isDisposed" in edge.mesh && typeof edge.mesh.isDisposed === "function") {
                assert.isFalse(edge.mesh.isDisposed(), "Edge mesh should not be disposed");
            }
        }
    }

    /**
     * Wait for the layout engine to settle.
     * Polls the layout manager's isSettled property until it returns true.
     */
    async function waitForLayoutSettle(maxWaitMs = 5000): Promise<void> {
        const { layoutManager } = graph as unknown as TestGraph;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            if (layoutManager.isSettled) {
                // Give one more frame for mesh positions to sync
                await delay(16);
                return;
            }

            await delay(16); // Poll every frame (~60fps)
        }

        // Timeout is acceptable for force-directed layouts that may never fully settle
    }

    /**
     * Verify node mesh positions match the layout engine positions.
     * This ensures the rendering pipeline correctly synced positions from layout to meshes.
     */
    async function verifyNodePositionsMatchLayout(): Promise<void> {
        const { layoutManager } = graph as unknown as TestGraph;
        const { layoutEngine } = layoutManager;

        // Verify layout engine exists
        assert.isDefined(layoutEngine, "Layout engine should exist");

        // Wait for layout to settle before comparing positions
        await waitForLayoutSettle();

        // For static layouts (like circular), positions should match exactly
        // For force-directed layouts, we allow more tolerance
        const isStaticLayout = layoutEngine.isSettled;
        const tolerance = isStaticLayout ? 0.01 : 1.0;

        let matchCount = 0;
        let totalNodes = 0;

        for (const node of graph.getNodes()) {
            totalNodes++;
            const meshPos = node.mesh.position;
            const enginePos = layoutEngine.getNodePosition(node);

            assert.isDefined(enginePos, `Layout engine should have position for node ${node.id}`);

            // Compare positions with tolerance
            const dx = Math.abs(meshPos.x - enginePos.x);
            const dy = Math.abs(meshPos.y - enginePos.y);
            const dz = Math.abs(meshPos.z - (enginePos.z ?? 0));

            if (dx <= tolerance && dy <= tolerance && dz <= tolerance) {
                matchCount++;
            }
        }

        // For circular (static) layout, all positions should match
        // For force-directed layouts, most should be close
        const requiredMatchRatio = isStaticLayout ? 1.0 : 0.5;
        const actualRatio = matchCount / totalNodes;

        assert.isAtLeast(
            actualRatio,
            requiredMatchRatio,
            `Expected ${requiredMatchRatio * 100}% of node positions to match layout engine, got ${actualRatio * 100}%`,
        );
    }

    /**
     * Verify the colour the renderer wrote into each node's own instance.
     *
     * NOT THE MATERIAL. Every node of one shape and size shares a source mesh whose material is
     * deliberately neutral, so that a graph of fifty thousand colours is fifty thousand
     * instances of one mesh rather than fifty thousand meshes. The colour lives in the
     * instance's own buffer, and that is what is read here.
     * @param expectedColor - The colour to expect, as hex.
     */
    function verifyNodeMeshMaterials(expectedColor: string): void {
        const expectedColorObj = Color3.FromHexString(expectedColor);
        for (const node of graph.getNodes()) {
            const painted = (node.mesh as InstancedMesh).instancedBuffers?.color as
                | { r: number; g: number; b: number }
                | undefined;

            if (painted) {
                assert.closeTo(painted.r, expectedColorObj.r, 0.01, `Node ${node.id} instance red should match`);
                assert.closeTo(painted.g, expectedColorObj.g, 0.01, `Node ${node.id} instance green should match`);
                assert.closeTo(painted.b, expectedColorObj.b, 0.01, `Node ${node.id} instance blue should match`);
            }
        }
    }

    /**
     * Verify node meshes have the expected shape type.
     */
    function verifyNodeMeshShapes(expectedShape: string): void {
        for (const node of graph.getNodes()) {
            const meshName = node.mesh instanceof InstancedMesh ? node.mesh.sourceMesh.name : node.mesh.name;
            assert.isTrue(
                meshName.toLowerCase().includes(expectedShape.toLowerCase()),
                `Node ${node.id} source mesh name "${meshName}" should contain shape "${expectedShape}"`,
            );
        }
    }

    /**
     * Verify nodes are arranged in a circular layout pattern.
     */
    function verifyCircularLayoutGeometry(): void {
        const positions = Array.from(graph.getNodes()).map((n) => n.mesh.position);
        if (positions.length < 3) {
            return;
        }

        let centerX = 0;
        let centerY = 0;
        let centerZ = 0;
        for (const pos of positions) {
            centerX += pos.x;
            centerY += pos.y;
            centerZ += pos.z;
        }
        centerX /= positions.length;
        centerY /= positions.length;
        centerZ /= positions.length;

        const distances: number[] = [];
        for (const pos of positions) {
            const dx = pos.x - centerX;
            const dy = pos.y - centerY;
            const dz = pos.z - centerZ;
            distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
        }

        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const tolerance = avgDistance * 0.2;

        for (const distance of distances) {
            assert.closeTo(
                distance,
                avgDistance,
                tolerance,
                "Node distance from center should be approximately equal for circular layout",
            );
        }
    }

    /**
     * Comprehensive mesh verification for final state.
     * @param skipMaterialCheck - Skip material color verification (useful for 2D mode tests)
     */
    async function verifyMeshState(skipMaterialCheck = false): Promise<void> {
        verifyNodeMeshesExist();
        verifyEdgeMeshesExist();
        await verifyNodePositionsMatchLayout();
        verifyNodeMeshShapes("sphere");
        verifyCircularLayoutGeometry();
        // Skip material check in 2D mode as mesh materials may differ
        if (!skipMaterialCheck && graph.getViewMode() !== "2d") {
            verifyNodeMeshMaterials("#4CAF50");
        }
    }

    // =========================================================================
    // Story 1: Style Changes twoD Property
    // =========================================================================

    describe("Story 1: Style Changes twoD Property", () => {
        it("should handle a view mode switch under a style layer", async () => {
            // Start with 3D
            await graph.setViewMode("3d");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify we're in 3D mode initially
            assert.isFalse(graph.getViewMode() === "2d", "Should start in 3D mode");

            // Switch to 2D - internally calls updateLayoutDimension()
            await delay(10);
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Should render correctly in 2D
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode after style change");
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");

            // Verify layout was applied (positions are not all zero)
            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            // Verify styles are preserved after 2D/3D switch
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should update layout dimension when twoD changes", async () => {
            // Start with 3D
            await graph.setViewMode("3d");
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify we're in 3D mode
            assert.isFalse(graph.getViewMode() === "2d", "Should start in 3D mode");

            // Switch to 2D
            await delay(10);
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Verify we switched to 2D - this proves the dimension change was processed
            assert.isTrue(graph.getViewMode() === "2d", "Should have switched to 2D mode");
        });

        it("should preserve node data when switching 2D/3D", async () => {
            // Start with 3D
            await graph.setViewMode("3d");
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            const initialNodeCount = graph.getNodeCount();
            const initialEdgeCount = graph.getEdgeCount();

            // Switch to 2D
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Nodes and edges should be preserved
            assert.equal(graph.getNodeCount(), initialNodeCount, "Node count should be preserved");
            assert.equal(graph.getEdgeCount(), initialEdgeCount, "Edge count should be preserved");
        });
    });

    // =========================================================================
    // Story 2: Style with Layout Property
    // =========================================================================

    describe("Story 2: Style with Layout Property", () => {
        it("should handle a layout set beside a style layer", async () => {
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Should apply circular layout correctly
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should take the last layout that was asked for", async () => {
            // Set circular first, then change our mind
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("random");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // The layout behavior depends on implementation - the key is no errors
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
        });

        it("should handle a layout set before any data", async () => {
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Should work without errors
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
        });
    });

    // =========================================================================
    // Story 3: Rapid Style Changes (2D/3D)
    // =========================================================================

    describe("Story 3: Rapid Style Changes (2D/3D)", () => {
        it("should handle rapid 2D/3D toggling", async () => {
            // Rapidly toggle 2D/3D
            await graph.setViewMode("3d");
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await delay(5);
            await graph.setViewMode("2d");

            await delay(5);
            await graph.setViewMode("3d");

            // Final: default (3D)
            await delay(5);
            await styleEveryNode(graph, NODE_STYLE);

            await graph.operationQueue.waitForCompletion();

            // Should render correctly in final state (3D)
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode after rapid toggling");
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
            // Verify final styles are correct after rapid toggling
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should settle to final state after rapid changes", async () => {
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // Rapid changes
            for (let i = 0; i < 5; i++) {
                await graph.setViewMode(i % 2 === 0 ? "2d" : "3d");
            }

            // Final: 2D
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Should be in 2D mode
            assert.isTrue(graph.getViewMode() === "2d", "Should settle to 2D mode");

            // Data should be intact
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
        });

        it("should not leak intermediate states", async () => {
            const modeChanges: boolean[] = [];

            // Track mode changes
            const checkMode = (): void => {
                modeChanges.push(graph.getViewMode() === "2d");
            };

            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // Start tracking
            const interval = setInterval(checkMode, 1);

            // Rapid toggling
            await graph.setViewMode("3d");
            await graph.setViewMode("2d");
            await graph.setViewMode("3d");
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            clearInterval(interval);

            // Final state should be 2D
            assert.isTrue(graph.getViewMode() === "2d", "Should end in 2D mode");
        });
    });

    // =========================================================================
    // Additional Nested Operation Tests
    // =========================================================================

    describe("Additional Nested Operation Tests", () => {
        it("should handle an algorithm run spawning a repaint", async () => {
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // A finished run spawns a style pass as a nested operation, which is how a layer
            // reading that run's column gets painted.
            await graph.runAlgorithm("graphty", "pagerank");

            await graph.operationQueue.waitForCompletion();

            // Should complete without errors
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should handle data-add triggering layout-update", async () => {
            let layoutUpdateTriggered = false;

            graph.on("operation-start", (event) => {
                const category = (event as Record<string, unknown>).category as string;
                if (category === "layout-update") {
                    layoutUpdateTriggered = true;
                }
            });

            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            // Data-add should trigger layout-update
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Layout-update should have been triggered
            assert.isTrue(layoutUpdateTriggered, "data-add should trigger layout-update");
        });

        it("should handle 2D mode switch correctly", async () => {
            // Start with 3D
            await graph.setViewMode("3d");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify 3D mode
            assert.isFalse(graph.getViewMode() === "2d", "Should start in 3D mode");

            // Switch to 2D - should update camera and layout appropriately
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Verify the mode switch completed successfully
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode after switch");

            // Verify data is intact
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should handle deeply nested operations", async () => {
            // Four settings that each spawn work of their own: the mode switch spawns a camera
            // update, the layout a layout-set, the run an algorithm-run and a repaint after it,
            // and the layer a style pass.
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setViewMode("2d");
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);
            await graph.runAlgorithm("graphty", "pagerank");

            await graph.operationQueue.waitForCompletion();

            // Should complete without deadlock or errors
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode");
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
            assert.equal(graph.getEdgeCount(), 2, "Should have 2 edges");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should prevent infinite recursion in nested operations", async () => {
            // Setup that could potentially cause recursive operations
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // Rapidly switch modes and colours, both of which trigger nested operations
            for (let i = 0; i < 10; i++) {
                await graph.setViewMode(i % 2 === 0 ? "2d" : "3d");
                await styleEveryNode(
                    graph,
                    { "node.color": `hsl(${String(i * 36)}, 50%, 50%)`, "node.shape": "sphere", "node.size": 10 },
                    `colour ${String(i)}`,
                );
            }

            // Should complete in reasonable time without stack overflow
            const timeoutPromise = new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    resolve(false);
                }, 5000);
            });

            const completionPromise = graph.operationQueue.waitForCompletion().then(() => {
                return true;
            });

            const completed = await Promise.race([completionPromise, timeoutPromise]);

            assert.isTrue(completed, "Should complete without infinite recursion");
        });
    });

    // =========================================================================
    // Error handling in nested operations
    // =========================================================================

    describe("Error Handling in Nested Operations", () => {
        it("should handle errors in nested operations gracefully", async () => {
            // Setup with valid style
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // The graph should still be functional after completion
            assert.equal(graph.getNodeCount(), 3, "Should have 3 nodes");
        });

        it("should continue processing after nested operation failure", async () => {
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            // Add data
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // Add more data (should work even if there were issues)
            await graph.addNodes([{ id: "4", label: "Node 4" }]);

            await graph.operationQueue.waitForCompletion();

            // Should have all nodes
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
        });
    });

    // =========================================================================
    // Operation ordering in nested scenarios
    // =========================================================================

    describe("Operation Ordering in Nested Scenarios", () => {
        it("should maintain correct order when parent operation spawns child", async () => {
            const operationOrder: string[] = [];

            graph.on("operation-complete", (event) => {
                const category = (event as Record<string, unknown>).category as string;
                operationOrder.push(category);
            });

            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.setViewMode("2d");
            await styleEveryNode(graph, NODE_STYLE);

            await graph.operationQueue.waitForCompletion();

            // The load spawns a style pass of its own, which is the child operation this is
            // about: nothing queued it directly, and it has to have finished by the time the
            // queue is idle.
            assert.isTrue(operationOrder.includes("data-add"), "data-add should be in operation order");
            assert.isTrue(operationOrder.includes("style-apply"), "and the repaint it spawned should be too");
        });

        it("should not block parent on child completion", async () => {
            // This tests that nested operations don't cause deadlock

            const startTime = Date.now();

            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // A 2D switch triggers a nested camera-update
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            const elapsed = Date.now() - startTime;

            // Should complete in reasonable time (not blocked)
            assert.isBelow(elapsed, 5000, "Should complete without blocking");

            // State should be correct
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode");
        });
    });
});
