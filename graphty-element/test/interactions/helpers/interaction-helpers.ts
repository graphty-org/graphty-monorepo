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
import type { CameraState, DragDelta, NodeData, ScreenPosition, TestGraphOptions, Vector3D } from "../types";

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
 * Get the current state of the active camera.
 * Returns different properties depending on whether it's 2D or 3D mode.
 *
 * @param graph - The graph instance
 * @returns Current camera state snapshot
 */
export function getCameraState(graph: Graph): CameraState {
    const viewMode = graph.getViewMode();
    const controller = graph.camera.getActiveController();

    if (!controller) {
        throw new Error("No active camera controller");
    }

    const { camera } = controller;
    const position = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
    };

    if (viewMode === "2d") {
        // 2D orthographic camera
        const orthoCamera = camera as {
            orthoTop?: number | null;
            orthoBottom?: number | null;
        };

        const top = orthoCamera.orthoTop ?? 10;
        const bottom = orthoCamera.orthoBottom ?? -10;
        const orthoRange = top - bottom;

        return {
            mode: "2d",
            position,
            orthoRange,
        };
    }

    // 3D arc rotate camera
    const arcCamera = camera as {
        alpha?: number;
        beta?: number;
        radius?: number;
    };

    return {
        mode: "3d",
        position,
        alpha: arcCamera.alpha,
        beta: arcCamera.beta,
        radius: arcCamera.radius,
    };
}

/**
 * Set up a test graph with specified options.
 * Creates a graph instance using NullEngine for headless testing.
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
 * Drag a node with the real mouse: press on its centre, move in steps, release.
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
 * Get the current scale of the scene (for XR pivot-based scaling).
 *
 * @param graph - The graph instance
 * @returns The current scene scale (1.0 = default)
 */
export function getSceneScale(graph: Graph): number {
    // In XR mode, scale is managed via the pivot controller
    // For non-XR modes, we return the ortho range ratio or radius ratio
    const state = getCameraState(graph);

    if (state.mode === "2d" && state.orthoRange !== undefined) {
        // Default ortho range is approximately 20 units
        return 20 / state.orthoRange;
    } else if (state.mode === "3d" && state.radius !== undefined) {
        // 30 is a fixed reference distance, not the camera's default: an unset
        // startingCameraDistance frames the graph to fit, so the start depends on the graph
        return 30 / state.radius;
    }

    return 1.0;
}

/**
 * Get the current rotation of the scene/camera.
 *
 * @param graph - The graph instance
 * @returns Euler angles (x, y, z) in radians
 */
export function getSceneRotation(graph: Graph): Vector3D {
    const controller = graph.camera.getActiveController();
    if (!controller) {
        return { x: 0, y: 0, z: 0 };
    }

    // For 2D mode, rotation is stored on the parent TransformNode
    if (graph.getViewMode() === "2d") {
        // Access the parent property which holds the rotation
        const twoDController = controller as unknown as {
            parent?: { rotation?: { x?: number; y?: number; z?: number } };
        };
        const parentRotation = twoDController.parent?.rotation;
        return {
            x: parentRotation?.x ?? 0,
            y: parentRotation?.y ?? 0,
            z: parentRotation?.z ?? 0,
        };
    }

    // For 3D mode, rotation is defined by alpha/beta angles
    const { camera } = controller;
    const arcCamera = camera as { alpha?: number; beta?: number };
    return {
        x: arcCamera.beta ?? 0,
        y: arcCamera.alpha ?? 0,
        z: 0,
    };
}

/**
 * Get the current camera position in world space.
 *
 * @param graph - The graph instance
 * @returns Camera position (x, y, z)
 */
export function getCameraPosition(graph: Graph): Vector3D {
    const controller = graph.camera.getActiveController();
    if (!controller) {
        return { x: 0, y: 0, z: 0 };
    }

    const pos = controller.camera.position;
    return {
        x: pos.x,
        y: pos.y,
        z: pos.z,
    };
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
 * Click a node with the real mouse, at its centre on screen.
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
