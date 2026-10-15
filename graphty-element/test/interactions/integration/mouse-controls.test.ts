/**
 * Mouse Controls Integration Tests
 *
 * These tests verify mouse interactions in a real browser environment
 * by creating Graph instances directly and driving them with real mouse and keyboard input
 * (test/helpers/real-input.ts).
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import { click, drag, holdKey, releaseHeldKeys, releaseKey, wheel } from "../../helpers/real-input";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }];

const TEST_EDGES = [
    { src: 1, dst: 2 },
    { src: 2, dst: 3 },
];

describe("Mouse Controls Integration", () => {
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

        test("drag to pan in 2D mode", async () => {
            // Get the camera controller
            const cameraController = graph.camera.getActiveController();
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Access the 2D camera controller directly to spy on pan method

            const cameraManager = graph.camera as any;
            const twoDController = cameraManager.activeCameraController;
            assert.isDefined(twoDController, "2D camera controller should be defined");

            // Spy on the pan method to verify it's being called
            const panSpy = vi.spyOn(twoDController, "pan");

            // A real drag from 100, 100 to 200, 150 (right and down)
            await drag(graph.canvas, { x: 100, y: 100 }, { x: 200, y: 150 });

            // Pan method should have been called during the drag
            assert.isAbove(panSpy.mock.calls.length, 0, "pan() should be called during mouse drag");
        });

        test("wheel to zoom in 2D mode", async () => {
            // Get the camera controller
            const cameraController = graph.camera.getActiveController();
            if (!cameraController) {
                throw new Error("Camera controller should be defined");
            }

            const { camera } = cameraController;
            const initialOrthoTop = camera.orthoTop ?? 10;
            const initialOrthoBottom = camera.orthoBottom ?? -10;
            const initialRange = initialOrthoTop - initialOrthoBottom;

            // A real wheel turn up (negative deltaY)
            await wheel(graph.canvas, { x: 200, y: 150 }, -100);

            // Zoom in should decrease ortho range
            await expect
                .poll(() => (camera.orthoTop ?? 10) - (camera.orthoBottom ?? -10), {
                    message: "Wheel up should zoom in (decrease ortho range)",
                })
                .toBeLessThan(initialRange);
        });

        test("wheel down to zoom out in 2D mode", async () => {
            // Get the camera controller
            const cameraController = graph.camera.getActiveController();
            if (!cameraController) {
                throw new Error("Camera controller should be defined");
            }

            const { camera } = cameraController;
            const initialOrthoTop = camera.orthoTop ?? 10;
            const initialOrthoBottom = camera.orthoBottom ?? -10;
            const initialRange = initialOrthoTop - initialOrthoBottom;

            // A real wheel turn down (positive deltaY)
            await wheel(graph.canvas, { x: 200, y: 150 }, 100);

            // Zoom out should increase ortho range
            await expect
                .poll(() => (camera.orthoTop ?? 10) - (camera.orthoBottom ?? -10), {
                    message: "Wheel down should zoom out (increase ortho range)",
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

        test("drag to orbit in 3D mode", async () => {
            // Get the camera controller - 3D mode uses OrbitCameraController
            const cameraController = graph.camera.getActiveController();
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Access the orbit controller and input controller

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            // Spy on the rotate method to verify it's called during drag
            const rotateSpy = vi.spyOn(orbitController, "rotate");

            const { canvas } = graph;

            // 3D mode uses direct canvas events
            await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 }, 1);

            // Verify rotate was called with the movement delta
            assert.isAbove(rotateSpy.mock.calls.length, 0, "rotate() should be called during drag");
            const [dx, dy] = rotateSpy.mock.calls[0];
            assert.equal(dx, 100, "dx should be the difference in clientX (200 - 100)");
            assert.equal(dy, 50, "dy should be the difference in clientY (150 - 100)");
        });

        test("keyboard W to zoom in 3D mode", async () => {
            // Get the camera controller - 3D mode uses OrbitCameraController

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            const initialDistance = orbitController.cameraDistance;

            const { canvas } = graph;
            canvas.focus();

            // 3D mode uses W key for zoom in (decrease distance)
            await holdKey("w");
            inputController.update();

            assert.isBelow(
                orbitController.cameraDistance,
                initialDistance,
                "W key should zoom in (decrease camera distance)",
            );

            await releaseKey("w");
        });

        test("keyboard S to zoom out in 3D mode", async () => {
            // Get the camera controller - 3D mode uses OrbitCameraController

            const cameraManager = graph.camera as any;
            const orbitController = cameraManager.activeCameraController;
            const inputController = cameraManager.activeInputHandler;

            assert.isDefined(orbitController, "Orbit camera controller should be defined");
            assert.isDefined(inputController, "Input controller should be defined");

            const initialDistance = orbitController.cameraDistance;

            const { canvas } = graph;
            canvas.focus();

            // 3D mode uses S key for zoom out (increase distance)
            await holdKey("s");
            inputController.update();

            assert.isAbove(
                orbitController.cameraDistance,
                initialDistance,
                "S key should zoom out (increase camera distance)",
            );

            await releaseKey("s");
        });
    });

    describe("Node Interaction", () => {
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

        test("canvas has tabindex for keyboard focus", () => {
            const { canvas } = graph;
            // Canvas should have tabindex attribute for keyboard focus
            assert.equal(canvas.getAttribute("tabindex"), "0", "Canvas should have tabindex='0' for focus");
        });

        test("pointer down triggers canvas focus", async () => {
            const { canvas } = graph;

            // Mock focus method
            const focusSpy = vi.spyOn(canvas, "focus").mockImplementation(() => undefined);

            // A real click on the canvas
            await click(canvas, { x: 200, y: 150 });

            // Canvas should have been focused
            assert.isAbove(focusSpy.mock.calls.length, 0, "Canvas should be focused on pointer down");
        });
    });
});
