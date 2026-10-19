/**
 * Touch Controls Integration Tests
 *
 * These tests verify touch interactions in a real browser environment
 * by creating Graph instances directly and driving them with real touch and keyboard input
 * (test/helpers/real-input.ts).
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import { holdKey, pinch, releaseHeldKeys, releaseKey, touchDrag } from "../../helpers/real-input";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }];

const TEST_EDGES = [
    { src: 1, dst: 2 },
    { src: 2, dst: 3 },
];

describe("Touch Controls Integration", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    describe("2D Mode", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "800px";
            container.style.height = "600px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();

            // Set up 2D mode
            await configureGraph(graph, { viewMode: "2d", layout: "circular", layoutOptions: { dim: 2 } });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await operationQueueOf(graph).waitForCompletion();

            // Wait for rendering to stabilize
            await graph.waitForStableFrame();
        });

        afterEach(async () => {
            await releaseHeldKeys();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("single finger pan in 2D mode", async () => {
            const cameraController = graph.camera.getActiveController();
            if (!cameraController) {
                throw new Error("Camera controller should be defined");
            }

            const { camera } = cameraController;
            const initialX = camera.position.x;
            const initialY = camera.position.y;

            // A real one-finger drag from 100, 100 to 200, 150
            await touchDrag(graph.canvas, { x: 100, y: 100 }, { x: 200, y: 150 });

            // Camera should have moved
            await expect
                .poll(() => camera.position.x !== initialX || camera.position.y !== initialY, {
                    message: "Camera position should have changed after pan",
                })
                .toBe(true);
        });

        test("pinch to zoom in 2D mode", async () => {
            // Get the camera controller
            const cameraController = graph.camera.getActiveController();
            if (!cameraController) {
                throw new Error("Camera controller should be defined");
            }

            const { camera } = cameraController;
            const initialOrthoTop = camera.orthoTop ?? 10;
            const initialOrthoBottom = camera.orthoBottom ?? -10;
            const initialRange = initialOrthoTop - initialOrthoBottom;

            // A real two-finger spread
            await pinch(graph.canvas, { x: 200, y: 150 }, 40, 160);

            // Zoom in (pinch spread) should decrease ortho range
            await expect
                .poll(() => (camera.orthoTop ?? 10) - (camera.orthoBottom ?? -10), {
                    message: "Pinch spread should zoom in (decrease ortho range)",
                })
                .toBeLessThan(initialRange);
        });

        test("pinch to zoom out in 2D mode", async () => {
            // Get the camera controller
            const cameraController = graph.camera.getActiveController();
            if (!cameraController) {
                throw new Error("Camera controller should be defined");
            }

            const { camera } = cameraController;
            const initialOrthoTop = camera.orthoTop ?? 10;
            const initialOrthoBottom = camera.orthoBottom ?? -10;
            const initialRange = initialOrthoTop - initialOrthoBottom;

            // A real two-finger pinch together
            await pinch(graph.canvas, { x: 200, y: 150 }, 160, 40);

            // Zoom out (pinch together) should increase ortho range
            await expect
                .poll(() => (camera.orthoTop ?? 10) - (camera.orthoBottom ?? -10), {
                    message: "Pinch together should zoom out (increase ortho range)",
                })
                .toBeGreaterThan(initialRange);
        });
    });

    describe("3D Mode", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "800px";
            container.style.height = "600px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();

            // Set up 3D mode
            await configureGraph(graph, { viewMode: "3d", layout: "circular", layoutOptions: { dim: 3 } });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await operationQueueOf(graph).waitForCompletion();

            // Wait for rendering to stabilize
            await graph.waitForStableFrame();
        });

        afterEach(async () => {
            await releaseHeldKeys();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("single finger drag orbits in 3D mode via pointer events", async () => {
            // 3D mode uses OrbitInputController with direct canvas events
            // Touch drags use the same pointer handlers as mouse drags
            const cameraController = graph.camera.getActiveController();
            assert.isDefined(cameraController, "Camera controller should be defined");

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            // Spy on the rotate method to verify it's called during drag
            const rotateSpy = vi.spyOn(orbitController, "rotate");

            const { canvas } = graph;

            // A real one-finger drag
            await touchDrag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 }, 1);

            // Verify rotate was called during drag
            assert.isAbove(rotateSpy.mock.calls.length, 0, "rotate() should be called during touch drag");
        });

        test("keyboard zoom in 3D mode (simulating pinch)", async () => {
            // Note: In 3D mode, pinch gestures use Hammer.js which is difficult to simulate.
            // However, keyboard W/S keys also control zoom in 3D mode.

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            const initialDistance = orbitController.cameraDistance;

            const { canvas } = graph;
            canvas.focus();

            // W key zooms in (decreases distance) - similar to pinch spread
            await holdKey("w");
            inputController.update();

            assert.isBelow(
                orbitController.cameraDistance,
                initialDistance,
                "W key (zoom in) should decrease camera distance (like pinch spread)",
            );

            await releaseKey("w");
        });

        test("keyboard zoom out 3D mode (simulating pinch)", async () => {
            // Note: In 3D mode, pinch gestures use Hammer.js which is difficult to simulate.
            // However, keyboard W/S keys also control zoom in 3D mode.

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            const initialDistance = orbitController.cameraDistance;

            const { canvas } = graph;
            canvas.focus();

            // S key zooms out (increases distance) - similar to pinch together
            await holdKey("s");
            inputController.update();

            assert.isAbove(
                orbitController.cameraDistance,
                initialDistance,
                "S key (zoom out) should increase camera distance (like pinch together)",
            );

            await releaseKey("s");
        });
    });
});
