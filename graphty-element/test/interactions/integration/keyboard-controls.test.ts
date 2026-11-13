/**
 * Keyboard Controls Integration Tests
 *
 * These tests verify keyboard interactions in a real browser environment
 * by creating Graph instances directly and pressing real keys (test/helpers/real-input.ts).
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test } from "vitest";

import { OrbitCameraController } from "../../../src/cameras/OrbitCameraController";
import { TwoDCameraController } from "../../../src/cameras/TwoDCameraController";
import { InputController } from "../../../src/cameras/TwoDInputController";
import { Graph, operationQueueOf } from "../../../src/Graph";
import { holdKey, releaseHeldKeys, releaseKey } from "../../helpers/real-input";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }];

const TEST_EDGES = [
    { src: 1, dst: 2 },
    { src: 2, dst: 3 },
];

/**
 * Helper to get the 2D input controller from the graph
 */
function get2DInputController(graph: Graph): InputController | undefined {
    const handler = graph.camera.getActiveInputHandler();
    return handler instanceof InputController ? handler : undefined;
}

/**
 * Helper to get the 2D camera controller from the graph
 */
function get2DCameraController(graph: Graph): TwoDCameraController | undefined {
    const controller = graph.camera.getActiveController();
    return controller instanceof TwoDCameraController ? controller : undefined;
}

describe("Keyboard Controls Integration", () => {
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

            // Wait for camera to be activated
            await graph.waitForStableFrame();
        });

        afterEach(async () => {
            await releaseHeldKeys();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("WASD controls work in 2D mode - W increases Y velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press W key
            await holdKey("w");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.y, 0, "W key should increase Y velocity");
        });

        test("WASD controls work in 2D mode - S decreases Y velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press S key
            await holdKey("s");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.y, 0, "S key should decrease Y velocity");
        });

        test("WASD controls work in 2D mode - A decreases X velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press A key
            await holdKey("a");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.x, 0, "A key should decrease X velocity");
        });

        test("WASD controls work in 2D mode - D increases X velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press D key
            await holdKey("d");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.x, 0, "D key should increase X velocity");
        });

        test("arrow keys work in 2D mode - ArrowUp increases Y velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press ArrowUp key
            await holdKey("ArrowUp");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.y, 0, "ArrowUp should increase Y velocity");
        });

        test("arrow keys work in 2D mode - ArrowDown decreases Y velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press ArrowDown key
            await holdKey("ArrowDown");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.y, 0, "ArrowDown should decrease Y velocity");
        });

        test("arrow keys work in 2D mode - ArrowLeft decreases X velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press ArrowLeft key
            await holdKey("ArrowLeft");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.x, 0, "ArrowLeft should decrease X velocity");
        });

        test("arrow keys work in 2D mode - ArrowRight increases X velocity", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Press ArrowRight key
            await holdKey("ArrowRight");
            // Velocity reset after the press: the render loop applies the held key too
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.x, 0, "ArrowRight should increase X velocity");
        });

        test("keyboard input disabled when controller is disabled", async () => {
            graph.canvas.focus();
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Disable input controller
            inputController.disable();

            // Reset velocity before the press, so a frame that heard the key would show in it
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Try keyboard input
            await holdKey("w");
            inputController.applyKeyboardInertia();

            // Velocity should remain zero when disabled
            assert.equal(cameraController.velocity.y, 0, "Keyboard input should have no effect when disabled");

            // Re-enable for cleanup
            inputController.enable();
        });
        test("a key still down when focus leaves the canvas stops panning", async () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);
            assert.isDefined(inputController);
            assert.isDefined(cameraController);
            const button = document.createElement("button");
            container.appendChild(button);

            graph.canvas.focus();
            await holdKey("a");
            button.focus();
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.equal(cameraController.velocity.x, 0, "a released off the canvas should not keep panning");
        });

        test("Ctrl+D is a page shortcut, not a pan", async () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);
            assert.isDefined(inputController);
            assert.isDefined(cameraController);

            graph.canvas.focus();
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            await holdKey("Control");
            await holdKey("d");
            inputController.applyKeyboardInertia();

            assert.equal(cameraController.velocity.x, 0);
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

            // Wait for camera to be activated
            await graph.waitForStableFrame();
        });

        afterEach(async () => {
            await releaseHeldKeys();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("canvas has tabindex for keyboard focus in 3D mode", () => {
            const { canvas } = graph;
            // Canvas should have tabindex attribute for keyboard focus
            assert.equal(canvas.getAttribute("tabindex"), "0", "Canvas should have tabindex='0' for focus");
        });

        test("3D camera has valid initial state", () => {
            const controller = graph.camera.getActiveController();
            assert.instanceOf(controller, OrbitCameraController);

            // Verify camera has valid 3D state
            const { position } = controller.camera;
            assert.isTrue([position.x, position.y, position.z].every(Number.isFinite), "Position should be finite");
            assert.isAbove(controller.cameraDistance, 0, "Distance should be positive");
        });

        test("keyboard events are received on focused canvas", async () => {
            const { canvas } = graph;

            let keyEventReceived = false;
            const handler = (): void => {
                keyEventReceived = true;
            };

            canvas.addEventListener("keydown", handler);

            // Focus the canvas
            canvas.focus();

            // Press a real key
            await holdKey("w");

            assert.isTrue(keyEventReceived, "Canvas should receive keyboard events when focused");

            canvas.removeEventListener("keydown", handler);
        });

        /**
         * Count the camera spins the 3D input handler makes over a few frames, after real key
         * presses on the focused canvas. Counting starts once the presses are done, so frames the
         * render loop draws while the keys travel do not count.
         * @param press - The real key presses to make on the focused canvas before the frames run
         * @returns The number of spin calls
         */
        async function spinsAfter(press: () => Promise<void>): Promise<number> {
            const handler = graph.camera.getActiveInputHandler();
            const controller = graph.camera.getActiveController();
            assert.isNotNull(handler);
            assert.instanceOf(controller, OrbitCameraController);

            const { canvas } = graph;
            canvas.focus();
            assert.strictEqual(document.activeElement, canvas, "canvas should take focus");
            await press();

            const original = controller.spin.bind(controller);
            let spins = 0;
            controller.spin = (dz: number): void => {
                spins++;
                original(dz);
            };
            for (let i = 0; i < 5; i++) {
                handler.update();
            }

            controller.spin = original;
            return spins;
        }

        test("A held on the focused canvas spins the camera", async () => {
            const spins = await spinsAfter(async () => {
                await holdKey("a");
            });
            assert.isAbove(spins, 0);
        });

        test("Shift+A is a page shortcut, not a camera spin", async () => {
            const spins = await spinsAfter(async () => {
                await holdKey("Shift");
                await holdKey("a");
            });
            assert.equal(spins, 0);
        });

        test("a key still down when focus leaves the canvas stops spinning", async () => {
            const button = document.createElement("button");
            container.appendChild(button);
            const spins = await spinsAfter(async () => {
                await holdKey("a");
                // Focus moves away; the keyup lands on the button, never on the canvas
                button.focus();
                await releaseKey("a");
            });
            assert.equal(spins, 0);
        });
    });
});
