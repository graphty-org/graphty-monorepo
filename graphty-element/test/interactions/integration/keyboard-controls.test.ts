/**
 * Keyboard Controls Integration Tests
 *
 * These tests verify keyboard interactions in a real browser environment
 * by creating Graph instances directly and simulating keyboard events.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }];

const TEST_EDGES = [
    { src: 1, dst: 2 },
    { src: 2, dst: 3 },
];

/**
 * Helper to get the 2D input controller from the graph
 */
function get2DInputController(graph: Graph):
    | {
          applyKeyboardInertia: () => void;
      }
    | undefined {
    const cameraManager = graph.camera;
    // Access via internal input registry

    const anyManager = cameraManager as any;
    if (anyManager.activeInputHandler?.applyKeyboardInertia) {
        return anyManager.activeInputHandler;
    }

    return undefined;
}

/**
 * Helper to get the 2D camera controller from the graph
 */
function get2DCameraController(graph: Graph):
    | {
          velocity: { x: number; y: number; zoom: number; rotate: number };
          camera: { position: { x: number; y: number; z: number }; orthoTop?: number; orthoBottom?: number };
      }
    | undefined {
    const controller = graph.camera.getActiveController();

    const anyController = controller as any;
    if (anyController.velocity) {
        return anyController;
    }

    return undefined;
}

/**
 * Helper to get the 3D camera state
 */
function get3DCameraState(graph: Graph): {
    alpha: number;
    beta: number;
    radius: number;
} {
    const controller = graph.camera.getActiveController();
    if (!controller) {
        throw new Error("No active camera controller");
    }

    const camera = controller.camera as any;
    return {
        alpha: camera.alpha ?? 0,
        beta: camera.beta ?? 0,
        radius: camera.radius ?? 30,
    };
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
            // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        afterEach(() => {
            graph.dispose();
            document.body.removeChild(container);
        });

        test("WASD controls work in 2D mode - W increases Y velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press W key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.y, 0, "W key should increase Y velocity");
        });

        test("WASD controls work in 2D mode - S decreases Y velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press S key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.y, 0, "S key should decrease Y velocity");
        });

        test("WASD controls work in 2D mode - A decreases X velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press A key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.x, 0, "A key should decrease X velocity");
        });

        test("WASD controls work in 2D mode - D increases X velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press D key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.x, 0, "D key should increase X velocity");
        });

        test("arrow keys work in 2D mode - ArrowUp increases Y velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press ArrowUp key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.y, 0, "ArrowUp should increase Y velocity");
        });

        test("arrow keys work in 2D mode - ArrowDown decreases Y velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press ArrowDown key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.y, 0, "ArrowDown should decrease Y velocity");
        });

        test("arrow keys work in 2D mode - ArrowLeft decreases X velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press ArrowLeft key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
            inputController.applyKeyboardInertia();

            assert.isBelow(cameraController.velocity.x, 0, "ArrowLeft should decrease X velocity");
        });

        test("arrow keys work in 2D mode - ArrowRight increases X velocity", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Press ArrowRight key
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
            inputController.applyKeyboardInertia();

            assert.isAbove(cameraController.velocity.x, 0, "ArrowRight should increase X velocity");
        });

        test("keyboard input disabled when controller is disabled", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);

            assert.isDefined(inputController, "Input controller should be defined");
            assert.isDefined(cameraController, "Camera controller should be defined");

            // Disable input controller

            const anyInput = inputController as any;
            if (anyInput.disable) {
                anyInput.disable();
            }

            // Reset velocity
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };

            // Try keyboard input
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
            inputController.applyKeyboardInertia();

            // Velocity should remain zero when disabled
            assert.equal(cameraController.velocity.y, 0, "Keyboard input should have no effect when disabled");

            // Re-enable for cleanup
            if (anyInput.enable) {
                anyInput.enable();
            }
        });
        test("a key still down when focus leaves the canvas stops panning", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);
            assert.isDefined(inputController);
            assert.isDefined(cameraController);
            const button = document.createElement("button");
            container.appendChild(button);

            graph.canvas.focus();
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
            button.focus();
            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            inputController.applyKeyboardInertia();

            assert.equal(cameraController.velocity.x, 0, "a released off the canvas should not keep panning");
        });

        test("Ctrl+D is a page shortcut, not a pan", () => {
            const inputController = get2DInputController(graph);
            const cameraController = get2DCameraController(graph);
            assert.isDefined(inputController);
            assert.isDefined(cameraController);

            cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
            graph.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true }));
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
            // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        afterEach(() => {
            graph.dispose();
            document.body.removeChild(container);
        });

        test("canvas has tabindex for keyboard focus in 3D mode", () => {
            const { canvas } = graph;
            // Canvas should have tabindex attribute for keyboard focus
            assert.equal(canvas.getAttribute("tabindex"), "0", "Canvas should have tabindex='0' for focus");
        });

        test("3D camera has valid initial state", () => {
            const state = get3DCameraState(graph);

            // Verify camera has valid 3D state
            assert.isNumber(state.alpha, "Alpha should be a number");
            assert.isNumber(state.beta, "Beta should be a number");
            assert.isNumber(state.radius, "Radius should be a number");
            assert.isAbove(state.radius, 0, "Radius should be positive");
        });

        test("keyboard events are received on focused canvas", () => {
            const { canvas } = graph;

            let keyEventReceived = false;
            const handler = (): void => {
                keyEventReceived = true;
            };

            canvas.addEventListener("keydown", handler);

            // Focus the canvas
            canvas.focus();

            // Dispatch keyboard event
            canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));

            assert.isTrue(keyEventReceived, "Canvas should receive keyboard events when focused");

            canvas.removeEventListener("keydown", handler);
        });

        /**
         * Count the camera spins the 3D input handler makes over a few frames.
         * @param press - What to do to the focused canvas before the frames run
         * @returns The number of spin calls
         */
        function spinsAfter(press: (canvas: HTMLCanvasElement) => void): number {
            const handler = (graph.camera as any).activeInputHandler;
            const { controller } = handler;
            const original = controller.spin.bind(controller);
            let spins = 0;
            controller.spin = (dz: number): void => {
                spins++;
                original(dz);
            };

            const { canvas } = graph;
            canvas.focus();
            assert.strictEqual(document.activeElement, canvas, "canvas should take focus");
            press(canvas);
            for (let i = 0; i < 5; i++) {
                handler.update();
            }

            controller.spin = original;
            return spins;
        }

        test("A held on the focused canvas spins the camera", () => {
            const spins = spinsAfter((canvas) => {
                canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
            });
            assert.isAbove(spins, 0);
        });

        test("Shift+A is a page shortcut, not a camera spin", () => {
            const spins = spinsAfter((canvas) => {
                canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "A", shiftKey: true, bubbles: true }));
            });
            assert.equal(spins, 0);
        });

        test("a key still down when focus leaves the canvas stops spinning", () => {
            const button = document.createElement("button");
            container.appendChild(button);
            const spins = spinsAfter((canvas) => {
                canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
                // Focus moves away; the keyup lands on the button, never on the canvas
                button.focus();
                button.dispatchEvent(new KeyboardEvent("keyup", { key: "a", bubbles: true }));
            });
            assert.equal(spins, 0);
        });
    });
});
