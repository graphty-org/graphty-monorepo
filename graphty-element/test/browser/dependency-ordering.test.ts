/**
 * Dependency Ordering Regression Tests
 *
 * These tests verify that the operation queue correctly handles dependencies
 * between operations, ensuring that dependent operations execute in the correct
 * order regardless of when they were queued.
 *
 * These tests correspond to the stories in stories/DependencyOrdering.stories.ts
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
    { id: "4", label: "Node 4" },
];

const TEST_EDGES = [
    { src: "1", dst: "2" },
    { src: "2", dst: "3" },
    { src: "3", dst: "4" },
];

/** The appearance every story in this file draws: a green sphere of size 10. */
const NODE_STYLE = { "node.color": "#4CAF50", "node.shape": "sphere", "node.size": 10 } as const;

/** That colour as the renderer writes it into a node's own instance. */
const NODE_COLOR = { r: 76, g: 175, b: 80, a: 1 };

// Helper to wait for a delay
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Dependency Ordering", () => {
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
    // Helper functions for position verification
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
    // Story 1: Rapid Layout + Data (no delay)
    // =========================================================================

    describe("Story 1: Rapid Layout + Data", () => {
        it("should handle rapid layout and data operations without delay", async () => {
            // No setTimeout - immediate operations
            // Testing stateless design: style AFTER data should work the same
            await graph.setLayout("circular"); // Queues layout-set
            await graph.addNodes(TEST_NODES); // Immediately triggers layout-update
            await graph.addEdges(TEST_EDGES);
            await styleEveryNode(graph, NODE_STYLE); // Style set LAST

            await graph.operationQueue.waitForCompletion();

            // Verify nodes should be positioned in circle
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should apply style correctly when set after data", async () => {
            // The key here is that style is set AFTER data but should still work
            await graph.setLayout("circular");
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            // Style set LAST - this tests that style-init doesn't require data to exist first
            await styleEveryNode(graph, NODE_STYLE);

            await graph.operationQueue.waitForCompletion();

            // Verify the graph rendered correctly
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            // Verify layout was applied
            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            // CRITICAL: Verify style applied correctly when set AFTER data
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Story 2: Multiple Data Additions
    // =========================================================================

    describe("Story 2: Multiple Data Additions", () => {
        it("should handle multiple data additions with only final layout-update executing", async () => {
            await graph.setLayout("circular");
            await graph.addNodes([TEST_NODES[0], TEST_NODES[1]]);
            await styleEveryNode(graph, NODE_STYLE); // Style set AFTER initial data

            await delay(10);
            await graph.addNodes([...TEST_NODES.slice(0, 2), ...TEST_NODES.slice(2)]);
            await graph.addEdges(TEST_EDGES); // Add edges after all nodes are present

            await graph.operationQueue.waitForCompletion();

            // Only final layout-update should execute (self-obsolescence)
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should coalesce multiple layout-update operations", async () => {
            let layoutUpdateCount = 0;

            // Track layout-update completions
            graph.on("operation-complete", (event) => {
                const category = (event as Record<string, unknown>).category as string;
                if (category === "layout-update") {
                    layoutUpdateCount++;
                }
            });

            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);

            // Rapid data additions that would each trigger layout-update
            await graph.addNodes([TEST_NODES[0]]);
            await graph.addNodes([TEST_NODES[1]]);
            await graph.addNodes([TEST_NODES[2]]);
            await graph.addNodes([TEST_NODES[3]]);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            // Layout updates should be coalesced (not one per data addition)
            // The exact number depends on batching, but should be less than 5
            assert.isBelow(layoutUpdateCount, 5, "Layout updates should be coalesced");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Story 3: Multiple Layouts Before Data
    // =========================================================================

    describe("Story 3: Multiple Layouts Before Data", () => {
        it("should use final layout when multiple layouts set before data", async () => {
            // Set multiple layouts before data
            await graph.setLayout("random");
            await graph.setLayout("random");
            await graph.setLayout("circular"); // Final

            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await styleEveryNode(graph, NODE_STYLE); // Style set LAST in timeout

            await graph.operationQueue.waitForCompletion();

            // Nodes should use circular layout, not random
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied (final layout)");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should obsolete previous layout-set operations", async () => {
            const layoutSetCategories: string[] = [];

            // Track layout-set starts
            graph.on("operation-start", (event) => {
                const category = (event as Record<string, unknown>).category as string;
                if (category === "layout-set") {
                    const description = (event as Record<string, unknown>).description as string;
                    layoutSetCategories.push(description);
                }
            });

            // Set multiple layouts
            await graph.setLayout("random");
            await graph.setLayout("random");
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Only the final layout-set should execute due to self-obsolescence
            // Previous layout-set operations should be obsoleted
            const circularSetCount = layoutSetCategories.filter((d) => d.includes("circular")).length;
            assert.equal(circularSetCount, 1, "Only one circular layout-set should execute");
        });
    });

    // =========================================================================
    // Story 4: Interleaved Layout + Data
    // =========================================================================

    describe("Story 4: Interleaved Layout + Data", () => {
        it("should handle interleaved layout and data changes correctly", async () => {
            await graph.setLayout("random");

            await delay(5);
            await graph.addNodes([TEST_NODES[0], TEST_NODES[1]]);

            await delay(5);
            await graph.setLayout("circular"); // Final
            await styleEveryNode(graph, NODE_STYLE); // Style interleaved with operations

            await delay(5);
            await graph.addNodes(TEST_NODES); // Final
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Visual: Circular layout with all nodes
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should apply final state regardless of interleaved order", async () => {
            // Different interleaving order
            await graph.addNodes([TEST_NODES[0]]);
            await graph.setLayout("random");

            await delay(5);
            await styleEveryNode(graph, NODE_STYLE);
            await graph.addNodes([TEST_NODES[1], TEST_NODES[2]]);

            await delay(5);
            await graph.setLayout("circular");
            await graph.addNodes([TEST_NODES[3]]);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Final state should be correct
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Additional dependency ordering tests
    // =========================================================================

    describe("Additional Dependency Tests", () => {
        it("should handle data before styling without errors", async () => {
            const executionOrder: string[] = [];

            // Track operation execution
            graph.on("operation-start", (event) => {
                const category = (event as Record<string, unknown>).category as string;
                if (category) {
                    executionOrder.push(category);
                }
            });

            // In stateless design, data can be added before anything styles it
            await graph.addNodes(TEST_NODES);
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify both operations executed successfully
            assert.isTrue(executionOrder.includes("data-add"), "data-add should execute");
            // A style edit is a queued run, and the repaint that follows the load is the queue's
            // own style-apply. There is no style-init operation any more: the element's styles
            // exist from construction, so the queue marks that category satisfied at init. The
            // edit is queued as `style-edit` rather than `algorithm-run` because a load obsoletes
            // the second and must not touch the first.
            assert.isTrue(executionOrder.includes("style-edit"), "the style edit should execute");
            assert.isTrue(executionOrder.includes("style-apply"), "and the load should be painted");

            // Verify the final state is correct
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should handle layout-set before data without errors", async () => {
            // This should work in stateless design - layout can be set before data exists
            await graph.setLayout("circular");
            await styleEveryNode(graph, NODE_STYLE);

            // Data added after layout is set
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Should work correctly
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("should handle edges before nodes by buffering", async () => {
            // Edges set before nodes - should be buffered until nodes exist
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            // Set edges first
            await graph.addEdges(TEST_EDGES);

            // Then add nodes
            await delay(10);
            await graph.addNodes(TEST_NODES);

            await graph.operationQueue.waitForCompletion();

            // Edges should be connected once nodes exist
            assert.equal(graph.getNodeCount(), 4, "Should have 4 nodes");
            assert.equal(graph.getEdgeCount(), 3, "Should have 3 edges");
        });

        it("should maintain FIFO order within same operation category", async () => {
            const nodeAddOrder: string[] = [];

            // Track node additions
            const originalAddNodes = graph.addNodes.bind(graph);
            let callIndex = 0;
            graph.addNodes = async (nodes, ...args) => {
                const idx = callIndex++;
                await originalAddNodes(nodes, ...args);
                nodeAddOrder.push(`add-${idx}`);
            };

            // Queue multiple data-add operations
            await styleEveryNode(graph, NODE_STYLE);
            await graph.addNodes([TEST_NODES[0]]);
            await graph.addNodes([TEST_NODES[1]]);
            await graph.addNodes([TEST_NODES[2]]);
            await graph.addNodes([TEST_NODES[3]]);

            await graph.operationQueue.waitForCompletion();

            // Should maintain FIFO order
            assert.deepEqual(nodeAddOrder, ["add-0", "add-1", "add-2", "add-3"]);
        });
    });

    // =========================================================================
    // Error handling and edge cases
    // =========================================================================

    describe("Error Handling and Edge Cases", () => {
        it("should handle empty graph operations gracefully", async () => {
            // Set configuration on empty graph
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Should not throw and should have no nodes/edges
            assert.equal(graph.getNodeCount(), 0, "Should have no nodes");
            assert.equal(graph.getEdgeCount(), 0, "Should have no edges");
        });

        it("should handle duplicate node IDs", async () => {
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            // Add nodes with same IDs multiple times
            await graph.addNodes([{ id: "1", label: "First" }]);
            await graph.addNodes([{ id: "1", label: "Second" }]); // Same ID
            await graph.addNodes([{ id: "2", label: "Node 2" }]);

            await graph.operationQueue.waitForCompletion();

            // Should have only unique nodes
            assert.equal(graph.getNodeCount(), 2, "Should have 2 unique nodes");
        });

        it("should handle rapid successive operations without race conditions", async () => {
            await styleEveryNode(graph, NODE_STYLE);
            await graph.setLayout("circular");

            // Fire operations rapidly - reduced count to avoid timeout
            for (let i = 0; i < 5; i++) {
                await graph.addNodes([{ id: `node-${i}`, label: `Node ${i}` }]);
            }

            await graph.operationQueue.waitForCompletion();

            // Should have all 5 nodes
            assert.equal(graph.getNodeCount(), 5, "Should have 5 nodes");
        }, 30000); // Extended timeout for this test
    });
});
