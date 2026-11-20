/**
 * Core test utilities for interaction testing
 *
 * These helpers provide common functionality needed across all interaction tests,
 * including graph setup, camera state retrieval, and node manipulation.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { vi } from "vitest";

import { Graph } from "../../../src/Graph";
import { assertPlaced } from "../../helpers/placed-position";
import { click, drag, nextFrame } from "../../helpers/real-input";
import { cleanupTestGraph, createTestGraph, setBehavior } from "../../helpers/testSetup";
import type { DragDelta, NodeData, ScreenPosition, TestGraphOptions } from "../types";

/**
 * Wait for a graph to be fully initialized and ready for interaction.
 * This ensures the camera, scene, and input handlers are all set up.
 *
 * @param graph - The graph instance to wait for
 */
export async function waitForGraphReady(graph: Graph): Promise<void> {
    await vi.waitFor(() => {
        if (!graph.initialized) {
            throw new Error("Graph did not initialize");
        }
    });

    // The picture is final: queued work has run, the layout has converged and the camera has
    // finished framing it, so a test that reads positions or the camera reads where they stay
    await graph.waitForStableFrame();

    // Trigger a render loop iteration to ensure layout is applied
    graph.scene.render();
}

/**
 * Get the screen position of a node by its ID.
 * Uses Babylon.js Vector3.Project to convert world coordinates to screen space.
 *
 * @param graph - The graph instance
 * @param nodeId - The ID of the node to find
 * @returns Screen coordinates or null if node not found
 */
export function getNodeScreenPosition(graph: Graph, nodeId: string | number): ScreenPosition | null {
    const node = graph.getNode(String(nodeId));
    if (!node) {
        return null;
    }

    const { scene, engine } = graph;
    const { activeCamera: camera } = scene;

    if (!camera) {
        return null;
    }

    // Force scene render to ensure all matrices are up-to-date
    scene.render();

    // A mesh no frame has placed yet is still at the template's position, far off screen
    assertPlaced(node.mesh.position, `node ${String(nodeId)}`);

    // Force world matrix computation to ensure absolutePosition is up-to-date
    node.mesh.computeWorldMatrix(true);

    // Use mesh.absolutePosition to account for parent transformations (like graph-root)
    const worldPos = node.mesh.absolutePosition;

    const { viewport } = camera;
    // Vector3.Project(vector, world, transform, viewport)
    // - world: object's world matrix (Identity for points already in world space)
    // - transform: view * projection matrix
    const screenPos = Vector3.Project(
        worldPos,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
    );

    return {
        x: screenPos.x,
        y: screenPos.y,
    };
}

/**
 * Set up a test graph with specified options.
 * Creates a graph instance on a real WebGL engine, since picking needs one.
 *
 * @param options - Configuration options for the test graph
 * @returns The initialized graph instance
 */
export async function setupTestGraph(options: TestGraphOptions = {}): Promise<Graph> {
    const { mode = "3d", pinOnDrag = true, layout = "ngraph", nodes = [], edges = [] } = options;

    // Use real WebGL engine for interaction tests - NullEngine doesn't support picking
    const graph = await createTestGraph();

    // Configure the graph, one setting at a time
    graph.setBackground({ backgroundType: "color", color: "#2D2D2D" });
    setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 }, node: { pinOnDrag } });
    await graph.setViewMode(mode);
    await graph.setLayout(layout);

    // Add initial nodes and edges if provided
    for (const nodeData of nodes) {
        await graph.addNode(nodeData);
    }

    for (const edgeData of edges) {
        await graph.addEdge(edgeData);
    }

    // Wait for everything to settle
    await waitForGraphReady(graph);

    return graph;
}

/**
 * Drag a node with the real mouse: press on its center, move in steps, release.
 *
 * @param graph - The graph instance
 * @param nodeId - The ID of the node to drag
 * @param delta - How far to move the pointer, in CSS pixels
 */
export async function dragNode(graph: Graph, nodeId: string | number, delta: DragDelta): Promise<void> {
    const at = graph.nodeScreenPosition(nodeId);
    if (!at) {
        throw new Error(`Node ${nodeId} not found`);
    }

    await drag(graph.canvas, at, { x: at.x + delta.dx, y: at.y + delta.dy }, 5);

    // Wait for whatever the drag queued to run, and a frame to show it
    await graph.waitForSettled();
    await nextFrame();
}

/**
 * Clean up a test graph created with setupTestGraph.
 *
 * @param graph - The graph instance to clean up
 */
export function teardownTestGraph(graph: Graph): void {
    cleanupTestGraph(graph);
}

/**
 * Default test nodes for interaction testing.
 * Creates a small triangle graph for basic tests.
 * Note: FixedLayout reads position from node.data.position
 */
export const DEFAULT_TEST_NODES: NodeData[] = [
    { id: "node1", position: { x: 0, y: 0, z: 0 } },
    { id: "node2", position: { x: 5, y: 0, z: 0 } },
    { id: "node3", position: { x: 2.5, y: 4, z: 0 } },
];

/**
 * Default test edges connecting the default test nodes.
 */
export const DEFAULT_TEST_EDGES = [
    { src: "node1", dst: "node2" },
    { src: "node2", dst: "node3" },
    { src: "node3", dst: "node1" },
];

/**
 * Click the real mouse at a point on the canvas.
 *
 * @param graph - The graph instance
 * @param position - Where, in CSS pixels from the canvas's top-left corner
 */
export async function clickAtPosition(graph: Graph, position: ScreenPosition): Promise<void> {
    await click(graph.canvas, position);

    // Wait for the selection styling the click queued to land
    await graph.waitForSettled();
}

/**
 * Click a node with the real mouse, at its center on screen.
 *
 * @param graph - The graph instance
 * @param nodeId - The ID of the node to click
 * @returns True if the click was performed, false if node not found
 */
export async function clickOnNode(graph: Graph, nodeId: string | number): Promise<boolean> {
    if (!graph.getNode(String(nodeId))) {
        return false;
    }

    // Read the node where the last frame drew it
    await graph.waitForStableFrame();
    const at = graph.nodeScreenPosition(nodeId);
    if (!at?.visible) {
        return false;
    }

    await clickAtPosition(graph, at);
    return true;
}

/**
 * Click the real mouse on the background (not on any node).
 *
 * @param graph - The graph instance
 */
export async function clickOnBackground(graph: Graph): Promise<void> {
    // Near the bottom-right corner of the canvas, where there's unlikely to be a node
    const { clientWidth, clientHeight } = graph.canvas;
    await clickAtPosition(graph, { x: clientWidth - 10, y: clientHeight - 10 });
}
