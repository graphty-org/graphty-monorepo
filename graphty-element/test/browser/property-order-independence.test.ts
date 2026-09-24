/**
 * Property Order Independence Regression Tests
 *
 * These tests verify that graph operations produce identical results
 * regardless of the order properties are set. The operation queue should ensure
 * deterministic execution order based on dependencies, not call order.
 *
 * These tests correspond to the stories in stories/Determinism.stories.ts
 *
 * THE EDGES ARE SUPPLIED WITH `setEdges`, NOT `addEdges`, and the difference matters now. Several
 * variants below hand the same edge set over more than once, which is what a host that re-renders
 * on state change does. `addEdges` ADDS -- two records for one pair are two edges, because the
 * element can hold parallel edges and no longer drops a repeat -- so an additive re-supply would
 * double the graph. `setEdges` is the verb for "this is my edge set", and it is what the
 * `edge-data` property calls. What these tests are about is unchanged: the same operations in any
 * order end with the same graph.
 */

import { Color3, InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { isDisposed, styleEveryEdge, styleEveryNode, type TestGraph } from "../helpers/testSetup";

// Test data constants (matching the stories)
const TEST_NODES = [
    { id: "1", label: "Node 1" },
    { id: "2", label: "Node 2" },
    { id: "3", label: "Node 3" },
    { id: "4", label: "Node 4" },
    { id: "5", label: "Node 5" },
    { id: "6", label: "Node 6" },
];

const TEST_EDGES = [
    { src: "1", dst: "2" },
    { src: "2", dst: "3" },
    { src: "3", dst: "4" },
    { src: "4", dst: "5" },
    { src: "5", dst: "6" },
    { src: "6", dst: "1" },
];

/** The appearance every variant in this file settles on: a green sphere of size 10. */
const NODE_STYLE = { "node.color": "#4CAF50", "node.shape": "sphere", "node.size": 10 } as const;

/** And grey edges three units wide. */
const EDGE_STYLE = { "edge.color": "#666666", "edge.width": 3 } as const;

/** The node colour as the renderer writes it into a node's own instance. */
const NODE_COLOR = { r: 76, g: 175, b: 80, a: 1 };

/**
 * Put the appearance every variant ends at onto a graph.
 *
 * A layer added later paints over a layer added earlier, so a variant that applies a wrong
 * appearance first and this one afterwards ends up drawing this one -- which is the whole point
 * of the scenarios below, said in the vocabulary of a stack rather than of a document that
 * replaced everything each time it was applied.
 * @param graph - The graph to style.
 */
async function applyFinalStyle(graph: Graph): Promise<void> {
    await styleEveryNode(graph, NODE_STYLE, "final nodes");
    await styleEveryEdge(graph, EDGE_STYLE, "final edges");
}

// Helper to wait for a delay
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Property Order Independence", () => {
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
     * More relaxed check - just verify nodes have non-zero positions (layout was applied)
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
     * This ensures eventual consistency: regardless of operation order, the final picture must
     * be the one the last layer asked for. Read from the style stack's own answer per node,
     * which is the one reading that says what a node is drawn as -- the colour beside the style,
     * because it is written into the node's own instance rather than into the material of the
     * source mesh every node of that shape shares.
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
     * Verify that all edges have the expected style properties applied.
     * This ensures eventual consistency for edge styling.
     */
    function verifyEdgeStyles(expectedColor: string, expectedWidth: number): void {
        for (const edge of graph.getDataManager().edges.values()) {
            // An edge carries its colour IN its style, because the edge renderer has no
            // per-instance state to carry one. See EdgePaint.
            const paint = graph.getStylePainter().edgePaint(edge.index);

            assert.isNotNull(paint, "Edge should have been painted");
            assert.equal(paint?.style.line?.color, expectedColor, `Edge should have color ${expectedColor}`);
            assert.equal(paint?.style.line?.width, expectedWidth, `Edge should have width ${expectedWidth}`);
        }
    }

    /**
     * Combined verification helper for the standard STYLE_TEMPLATE
     */
    function verifyFinalStyles(): void {
        verifyNodeStyles(NODE_COLOR, "sphere", 10);
        verifyEdgeStyles("#666666", 3);
    }

    // =========================================================================
    // Mesh verification helpers - verify actual Babylon.js meshes are correct
    // =========================================================================

    /**
     * Verify all node meshes exist and are not disposed.
     * This ensures the 3D rendering pipeline created valid meshes.
     */
    function verifyNodeMeshesExist(): void {
        for (const node of graph.getNodes()) {
            assert.isDefined(node.mesh, `Node ${node.id} should have a mesh`);
            assert.isFalse(isDisposed(node.mesh), `Node ${node.id} mesh should not be disposed`);
        }
    }

    /**
     * Verify all edge meshes exist and are not disposed.
     * This ensures edges were properly rendered.
     */
    function verifyEdgeMeshesExist(): void {
        for (const edge of (graph as unknown as TestGraph).dataManager.edges.values()) {
            assert.isDefined(edge.mesh, "Edge should have a mesh");
            // PatternedLineMesh doesn't have isDisposed method the same way
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
        // but we should at least have the layout running
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
     * instances of one mesh rather than fifty thousand meshes.
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
     * For InstancedMesh, the shape is in sourceMesh.name (e.g., "sphere", "box").
     * For regular Mesh, the shape is in mesh.name.
     */
    function verifyNodeMeshShapes(expectedShape: string): void {
        for (const node of graph.getNodes()) {
            // For InstancedMesh, check sourceMesh.name; for regular Mesh, check mesh.name
            const meshName = node.mesh instanceof InstancedMesh ? node.mesh.sourceMesh.name : node.mesh.name;
            assert.isTrue(
                meshName.toLowerCase().includes(expectedShape.toLowerCase()),
                `Node ${node.id} source mesh name "${meshName}" should contain shape "${expectedShape}"`,
            );
        }
    }

    /**
     * Verify nodes are arranged in a circular layout pattern.
     * For circular layout, all nodes should be at roughly equal distance from center
     * and distributed around the center.
     */
    function verifyCircularLayoutGeometry(): void {
        const positions = Array.from(graph.getNodes()).map((n) => n.mesh.position);
        if (positions.length < 3) {
            return; // Need at least 3 nodes to verify circular pattern
        }

        // Calculate center of all positions
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

        // Calculate distances from center
        const distances: number[] = [];
        for (const pos of positions) {
            const dx = pos.x - centerX;
            const dy = pos.y - centerY;
            const dz = pos.z - centerZ;
            distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
        }

        // For circular layout, all distances should be roughly equal
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const tolerance = avgDistance * 0.2; // Allow 20% variance

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
     * Verify that the layout engine is of the expected type.
     * This ensures setLayout() actually configured the correct layout engine.
     */
    function verifyLayoutEngineType(expectedType: string): void {
        const { layoutManager } = graph as unknown as TestGraph;
        const { layoutEngine } = layoutManager;

        assert.isDefined(layoutEngine, "Layout engine should exist");
        // Layout engine class name contains the type (e.g., "CircularLayoutEngine")
        const engineName = layoutEngine.constructor.name;
        assert.isTrue(
            engineName.toLowerCase().includes(expectedType.toLowerCase()),
            `Layout engine "${engineName}" should be "${expectedType}" type`,
        );
    }

    // Note: verifyAlgorithmResults was removed because the Determinism stories don't set
    // runAlgorithmsOnLoad=true, so algorithms are configured but never executed.
    // Algorithm execution is verified separately in test/algorithms/ tests.

    /**
     * Verify that all node Z positions are near 0 in 2D mode.
     * In 2D mode, the layout should constrain all nodes to the XY plane.
     */
    function verify2DModePositions(): void {
        assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode for this verification");

        for (const node of graph.getNodes()) {
            const pos = node.mesh.position;
            assert.closeTo(pos.z, 0, 0.01, `Node ${node.id} Z position should be ~0 in 2D mode, got ${pos.z}`);
        }
    }

    /**
     * Comprehensive mesh verification for final state.
     * Verifies meshes exist, positions match, materials, shapes, and layout geometry.
     * @param skipMaterialCheck - Skip material color verification (useful for 2D mode tests)
     */
    async function verifyMeshState(skipMaterialCheck = false): Promise<void> {
        verifyNodeMeshesExist();
        verifyEdgeMeshesExist();
        await verifyNodePositionsMatchLayout();
        // Verify node shape - all tests use sphere shape
        verifyNodeMeshShapes("sphere");
        // Verify circular layout geometry
        verifyCircularLayoutGeometry();
        // Verify layout engine type is circular
        verifyLayoutEngineType("circular");
        // Skip material check in 2D mode as mesh materials may differ
        if (!skipMaterialCheck && graph.getViewMode() !== "2d") {
            verifyNodeMeshMaterials("#4CAF50");
        }
    }

    // =========================================================================
    // Scenario 1: Deterministic Output Despite Property Order
    // =========================================================================

    describe("Scenario 1: Deterministic Output Despite Property Order", () => {
        it("Variant 1: Style → Data → Layout", async () => {
            // Order: Style → Data → Layout
            await applyFinalStyle(graph);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify nodes and edges
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            // Verify circular layout
            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 2: Layout → Data (reversed) → Style", async () => {
            // Order: Layout → Data (reversed) → Style
            await graph.setLayout("circular");
            await graph.setEdges(TEST_EDGES); // Edges before nodes!
            await graph.addNodes(TEST_NODES);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify nodes and edges
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            // Verify circular layout
            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 2: Asynchronous Property Updates
    // =========================================================================

    describe("Scenario 2: Asynchronous Property Updates", () => {
        it("Variant 3: Delayed data loading with wrong initial state", async () => {
            // Start with wrong layout
            await graph.setLayout("random");
            await applyFinalStyle(graph);

            // Load partial data first
            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 3));

            // Fix layout
            await delay(5);
            await graph.setLayout("circular");

            // Load correct complete data
            await delay(5);
            await graph.addNodes(TEST_NODES);

            await delay(5);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 4: Multiple style updates with delayed data", async () => {
            // Start with wrong style
            await styleEveryNode(
                graph,
                { "node.color": "#FF0000", "node.shape": "sphere", "node.size": 10 },
                "wrong nodes",
            );
            await graph.setLayout("random");

            // Fix layout first
            await delay(5);
            await graph.setLayout("circular");

            // Load data
            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            // Update to correct style last
            await delay(30);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            // CRITICAL: Verify styles changed from wrong (#FF0000) to correct (#4CAF50)
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 3: Partial Data Updates
    // =========================================================================

    describe("Scenario 3: Partial Data Updates", () => {
        it("Variant 5: Incremental data loading with corrections", async () => {
            // Start with wrong layout and style
            await graph.setLayout("random");
            await styleEveryNode(
                graph,
                { "node.color": "#0000FF", "node.shape": "box", "node.size": 10 },
                "wrong nodes",
            );
            await styleEveryEdge(graph, { "edge.color": "#FF0000", "edge.width": 3 }, "wrong edges");

            // Load partial data immediately
            await graph.addNodes(TEST_NODES.slice(0, 2));

            // Fix layout
            await delay(10);
            await graph.setLayout("circular");

            // Load more partial data
            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 4));

            // Fix style
            await delay(5);
            await applyFinalStyle(graph);

            // Load complete node data
            await delay(5);
            await graph.addNodes(TEST_NODES);

            // Load edges last
            await delay(5);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 6: Maximum chaos with multiple wrong updates", async () => {
            // Chaotic sequence of operations
            await graph.setEdges(TEST_EDGES); // Edges first - will be buffered
            await graph.setLayout("random");

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 2));

            await delay(3);
            await graph.setLayout("d3");

            await delay(2);
            await graph.addNodes(TEST_NODES.slice(0, 4));

            await delay(5);
            await styleEveryNode(
                graph,
                { "node.color": "#0000FF", "node.shape": "box", "node.size": 10 },
                "wrong nodes 1",
            );
            await styleEveryEdge(graph, { "edge.color": "#FF0000", "edge.width": 3 }, "wrong edges 1");

            await delay(5);
            await styleEveryNode(
                graph,
                { "node.color": "#FF00FF", "node.shape": "cylinder", "node.size": 10 },
                "wrong nodes 2",
            );
            await styleEveryEdge(graph, { "edge.color": "#00FF00", "edge.width": 3 }, "wrong edges 2");

            await delay(5);
            await graph.setLayout("circular");

            await delay(5);
            await graph.addNodes(TEST_NODES);

            await delay(5);
            await graph.setEdges(TEST_EDGES);

            await delay(5);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 4: Cancellation Patterns
    // =========================================================================

    describe("Scenario 4: Cancellation Patterns", () => {
        it("Variant 7: Cancel style loading mid-flight", async () => {
            // Add several layers in quick succession - the last one painted is what shows
            await styleEveryNode(
                graph,
                { "node.color": "#FF0000", "node.shape": "sphere", "node.size": 10 },
                "wrong nodes 1",
            );

            await delay(5);
            await styleEveryNode(
                graph,
                { "node.color": "#0000FF", "node.shape": "sphere", "node.size": 10 },
                "wrong nodes 2",
            );

            await delay(5);
            await applyFinalStyle(graph);

            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await delay(5);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 8: Cancel data loading and set new data", async () => {
            // Load wrong partial data
            await graph.addNodes(TEST_NODES.slice(0, 2));
            await graph.setEdges(TEST_EDGES.slice(0, 1));

            // Replace with different partial data
            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 4));
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            // Load correct complete data
            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await delay(5);
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 9: Cancel force layout mid-execution", async () => {
            // Set multiple layouts in quick succession - only last should complete
            await graph.setLayout("ngraph");

            await delay(5);
            await graph.setLayout("d3");

            await delay(5);
            await graph.setLayout("circular");

            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 5: Algorithm Integration
    // =========================================================================

    describe("Scenario 5: Algorithm Integration", () => {
        it("Variant 10: Algorithm + Style, then load data", async () => {
            // AN ALGORITHM IS A VERB NOW, so it is started where the data it measures exists.
            // The style template used to carry a list of algorithms to run on load, which is
            // why this variant set it before the data; the ordering actually under test is
            // still the one between the style, the layout and the load.
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.runAlgorithm("graphty", "pagerank");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 11: Layout before data", async () => {
            // Set layout before any data exists
            await graph.setLayout("circular");

            await delay(5);
            await applyFinalStyle(graph);

            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 6: Manual Node/Edge Addition
    // =========================================================================

    describe("Scenario 6: Manual Node/Edge Addition", () => {
        it("Variant 12: Config then manual add", async () => {
            // Set all configuration first
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            // Manually add nodes incrementally
            await delay(5);
            await graph.addNodes([TEST_NODES[0]]);

            await delay(5);
            await graph.addNodes([TEST_NODES[0], TEST_NODES[1]]);

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 3));

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 4));

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 5));

            await delay(5);
            await graph.addNodes(TEST_NODES);

            // Add edges incrementally
            await delay(5);
            await graph.setEdges([TEST_EDGES[0]]);

            await delay(5);
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            await delay(5);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 13: Interleaved manual add", async () => {
            // Add some initial data
            await graph.addNodes(TEST_NODES.slice(0, 2));
            await graph.setEdges([TEST_EDGES[0]]);

            await delay(10);
            // Set configuration in the middle
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            await delay(10);
            // Add more nodes
            await graph.addNodes(TEST_NODES.slice(0, 4));
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            await delay(10);
            // Complete the data
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 7: Configuration Replacement
    // =========================================================================

    describe("Scenario 7: Configuration Replacement", () => {
        it("Variant 14: Replace style after initial setup", async () => {
            // Initial complete setup with wrong style
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await styleEveryNode(
                graph,
                { "node.color": "#FF0000", "node.shape": "box", "node.size": 10 },
                "wrong nodes",
            );
            await styleEveryEdge(graph, { "edge.color": "#0000FF", "edge.width": 3 }, "wrong edges");
            await graph.setLayout("circular");

            // Replace style after everything is loaded
            await delay(20);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 15: Replace layout after initial setup", async () => {
            // Initial complete setup with wrong layout
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await applyFinalStyle(graph);
            await graph.setLayout("random");

            // Replace layout after everything is loaded
            await delay(20);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 16: Replace both layout and style", async () => {
            // Initial complete setup with wrong style and layout
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await styleEveryNode(
                graph,
                { "node.color": "#0000FF", "node.shape": "cylinder", "node.size": 10 },
                "wrong nodes",
            );
            await styleEveryEdge(graph, { "edge.color": "#FF00FF", "edge.width": 3 }, "wrong edges");
            await graph.setLayout("ngraph");

            // Replace both after everything is loaded
            await delay(30);
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 8: Extreme Edge Cases
    // =========================================================================

    describe("Scenario 8: Extreme Edge Cases", () => {
        it("Variant 17: Interleaved node and edge additions", async () => {
            // Interleave nodes and edges in chaotic order
            await graph.addNodes([TEST_NODES[0]]);

            await delay(5);
            await graph.setEdges([TEST_EDGES[0]]);

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 3));

            await delay(5);
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            await delay(5);
            await graph.addNodes(TEST_NODES);

            await delay(5);
            await graph.setEdges(TEST_EDGES);

            await delay(5);
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 18: Multiple rapid layout changes", async () => {
            // Set data and style first
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await applyFinalStyle(graph);

            // Rapidly switch layouts
            await graph.setLayout("random");

            await delay(2);
            await graph.setLayout("ngraph");

            await delay(2);
            await graph.setLayout("random");

            await delay(2);
            await graph.setLayout("d3");

            await delay(2);
            await graph.setLayout("ngraph");

            await delay(2);
            await graph.setLayout("circular");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 19: Empty start with everything delayed", async () => {
            // Start completely empty, add everything with delays
            await delay(10);
            await graph.setLayout("circular");

            await delay(10);
            await applyFinalStyle(graph);

            await delay(10);
            await graph.addNodes(TEST_NODES);

            await delay(10);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 20: Configuration first, long-delayed data", async () => {
            // Set all configuration immediately
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            // Wait a long time before loading data
            await delay(50);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 9: Algorithm Re-execution After Data Changes
    // =========================================================================

    describe("Scenario 9: Algorithm Re-execution After Data Changes", () => {
        it("Variant 21: Algorithm re-run on data add", async () => {
            await graph.setLayout("circular");

            // Load initial data
            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 3));
            await graph.setEdges(TEST_EDGES.slice(0, 2));

            await delay(5);
            await applyFinalStyle(graph);
            await graph.runAlgorithm("graphty", "pagerank");

            // Add more data - algorithm should automatically re-run
            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 5));
            await graph.setEdges(TEST_EDGES.slice(0, 4));

            // Add final data - algorithm should re-run again
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 22: Algorithm re-run on data replace", async () => {
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            // Load initial data
            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 3));
            await graph.setEdges(TEST_EDGES.slice(0, 2));

            // Replace with different data
            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 4));
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            // Replace with final complete data
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 23: Multiple algorithms re-run", async () => {
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            // Add data incrementally - algorithms should re-run each time
            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 2));
            await graph.setEdges([TEST_EDGES[0]]);

            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 4));
            await graph.setEdges(TEST_EDGES.slice(0, 3));

            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 10: Camera Mode (2D/3D) with Style Updates
    // =========================================================================

    describe("Scenario 10: Camera Mode (2D/3D) with Style Updates", () => {
        it("Variant 24: 2D camera + style updates", async () => {
            // Configure 2D camera from the start
            await graph.setViewMode("2d");
            await applyFinalStyle(graph);

            // Load data
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            // Change layout
            await delay(10);
            await graph.setLayout("circular");

            // Update style properties (while in 2D mode)
            await delay(10);
            await applyFinalStyle(graph);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            // Verify we're in 2D mode with correct Z positions
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode");
            verify2DModePositions();
        });

        it("Variant 25: 3D → 2D + Style Update", async () => {
            // Start in 3D (default)
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.setLayout("circular");

            // Set initial 3D style
            await delay(10);
            await applyFinalStyle(graph);

            // Verify we're in 3D mode initially
            assert.isFalse(graph.getViewMode() === "2d", "Should start in 3D mode");

            // Switch to 2D camera
            await delay(10);
            await graph.setViewMode("2d");

            await graph.operationQueue.waitForCompletion();

            // Verify we switched to 2D mode
            assert.isTrue(graph.getViewMode() === "2d", "Should be in 2D mode after switch");

            // Verify Z positions are flattened when switching from 3D to 2D
            verify2DModePositions();

            // Verify data is still intact
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
        });

        it("Variant 26: Rapid camera switch with Z restoration", async () => {
            // Load data first
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.setLayout("circular");

            // Initial 3D style
            await applyFinalStyle(graph);
            await graph.operationQueue.waitForCompletion();

            // The mesh positions are synced from the layout engine on the frame loop, so they
            // are asked for explicitly here: a Z read before the sync is 0, and a test that
            // recorded 0 as the "original" would pass whether or not it was ever restored.
            for (const node of graph.getNodes()) {
                node.update();
            }

            // Store original 3D Z positions
            const originalZPositions = new Map<string | number, number>();
            for (const node of graph.getNodes()) {
                originalZPositions.set(node.id, node.mesh.position.z);
            }

            // Switch to 2D
            await delay(5);
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are flattened
            verify2DModePositions();

            // Switch back to 3D
            await delay(5);
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are restored
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode after switch back");
            for (const node of graph.getNodes()) {
                const originalZ = originalZPositions.get(node.id);
                if (originalZ === undefined) {
                    assert.fail(`Should have original Z for node ${node.id}`);
                }

                assert.closeTo(
                    node.mesh.position.z,
                    originalZ,
                    0.01,
                    `Node ${node.id} Z position should be restored to ${originalZ}, got ${node.mesh.position.z}`,
                );
            }

            // Switch to 2D again
            await delay(5);
            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();

            // Verify Z positions are flattened again
            verify2DModePositions();

            // Final: back to 3D
            await delay(5);
            await graph.setViewMode("3d");
            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode after final switch");

            // Verify Z positions are restored again
            for (const node of graph.getNodes()) {
                const originalZ = originalZPositions.get(node.id);
                if (originalZ === undefined) {
                    assert.fail(`Should have original Z for node ${node.id}`);
                }

                assert.closeTo(
                    node.mesh.position.z,
                    originalZ,
                    0.01,
                    `Node ${node.id} Z position should be restored to ${originalZ}, got ${node.mesh.position.z}`,
                );
            }
        });
    });

    // =========================================================================
    // Scenario 11: Algorithm + Camera Combinations
    // =========================================================================

    describe("Scenario 11: Algorithm + Camera Combinations", () => {
        it("Variant 27: Algorithm 3D → 2D", async () => {
            // Load data in 3D and measure it
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await applyFinalStyle(graph);
            await graph.setLayout("circular");
            await graph.runAlgorithm("graphty", "pagerank");

            // Switch to 2D camera after the algorithm has run
            await delay(20);
            await graph.setViewMode("2d");

            // Switch back to 3D
            await delay(10);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");
        });

        it("Variant 28: 2D camera + algorithm", async () => {
            // Configure 2D camera, then measure the graph in it
            await graph.setViewMode("2d");
            await applyFinalStyle(graph);
            await graph.setLayout("circular");

            // Load data, then run the algorithm over it in 2D mode
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.runAlgorithm("graphty", "pagerank");

            // Switch to 3D
            await delay(20);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");
        });

        it("Variant 29: Algorithm + layout + camera all changing", async () => {
            // Load data first
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            // Wrong layout initially
            await graph.setLayout("random");

            // Wrong camera mode initially (2D)
            await delay(10);
            await graph.setViewMode("2d");

            // Fix layout
            await delay(10);
            await graph.setLayout("circular");

            // Add algorithm
            await delay(10);
            await applyFinalStyle(graph);
            await graph.runAlgorithm("graphty", "pagerank");

            // Fix camera to 3D
            await delay(10);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });
    });

    // =========================================================================
    // Scenario 12: Complex Multi-Property Combinations
    // =========================================================================

    describe("Scenario 12: Complex Multi-Property Combinations", () => {
        it("Variant 30: Complex delayed updates", async () => {
            // 1. Load data
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            // 2. Run algorithm
            await delay(10);
            await applyFinalStyle(graph);
            await graph.runAlgorithm("graphty", "pagerank");

            // 3. Change layout
            await delay(10);
            await graph.setLayout("circular");

            // 4. Switch to 2D camera
            await delay(10);
            await graph.setViewMode("2d");

            // 5. Update style and switch back to 3D
            await delay(10);
            await applyFinalStyle(graph);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 31: Interleaved complex operations", async () => {
            // 1. Add initial data
            await graph.addNodes(TEST_NODES.slice(0, 3));
            await graph.setEdges(TEST_EDGES.slice(0, 2));

            // 2. Run algorithm on initial data
            await delay(10);
            await applyFinalStyle(graph);
            await graph.runAlgorithm("graphty", "pagerank");

            // 3. Add more data
            await delay(10);
            await graph.addNodes(TEST_NODES.slice(0, 5));
            await graph.setEdges(TEST_EDGES.slice(0, 4));

            // 4. Switch to 2D camera
            await delay(10);
            await graph.setViewMode("2d");

            // 5. Update style
            await delay(10);
            await applyFinalStyle(graph);

            // 6. Add final data and set layout
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await delay(10);
            await graph.setLayout("circular");

            // Switch back to 3D
            await delay(10);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 32: Manual add + algorithm", async () => {
            // Set layout first
            await graph.setLayout("circular");

            // Manually add first node
            await graph.addNodes([TEST_NODES[0]]);

            // Style the graph
            await delay(5);
            await applyFinalStyle(graph);

            // Continue adding nodes manually
            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 2));

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 3));
            await graph.setEdges([TEST_EDGES[0]]);

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 4));
            await graph.setEdges(TEST_EDGES.slice(0, 2));

            await delay(5);
            await graph.addNodes(TEST_NODES.slice(0, 5));
            await graph.setEdges(TEST_EDGES.slice(0, 4));

            await delay(5);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");

            const positions = getNodePositions();
            assert.isTrue(layoutWasApplied(positions), "Layout should have been applied to nodes");
            verifyFinalStyles();
            await verifyMeshState();
        });

        it("Variant 33: Full 2D setup", async () => {
            // Set 2D layout
            await graph.setLayout("circular");

            // Set 2D camera
            await graph.setViewMode("2d");

            // Load data, then measure it
            await delay(10);
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.runAlgorithm("graphty", "pagerank");

            // Update styles (still in 2D)
            await delay(10);
            await applyFinalStyle(graph);

            // Switch to 3D to match final state
            await delay(10);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

        });

        it("Variant 34: Cancel algorithm + camera", async () => {
            // Load data
            await graph.addNodes(TEST_NODES);
            await graph.setEdges(TEST_EDGES);
            await graph.setLayout("circular");

            // Start with betweenness
            await graph.runAlgorithm("graphty", "betweenness");

            // Switch camera mode
            await delay(5);
            await graph.setViewMode("2d");

            // Run pagerank beside it
            await delay(5);
            await graph.runAlgorithm("graphty", "pagerank");

            // Switch back to 3D
            await delay(10);
            await graph.setViewMode("3d");

            await graph.operationQueue.waitForCompletion();

            // Verify final state
            assert.equal(graph.getNodeCount(), 6, "Should have 6 nodes");
            assert.equal(graph.getEdgeCount(), 6, "Should have 6 edges");
            assert.isFalse(graph.getViewMode() === "2d", "Should be in 3D mode");

        });
    });
});
