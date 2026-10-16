import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, expect, test, vi } from "vitest";

import { TwoDCameraController } from "../../src/cameras/TwoDCameraController";
import { InputController } from "../../src/cameras/TwoDInputController";
import { Graph } from "../../src/Graph";
import { click, drag, holdKey, releaseHeldKeys, releaseKey, wheel } from "../helpers/real-input";
import { cleanupTestGraph, createTestGraph, setBehavior } from "../helpers/testSetup";

describe("2D Camera Controls", () => {
    let graph: Graph;
    let cameraController: TwoDCameraController;
    let inputController: InputController;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });
        await graph.setViewMode("2d");
        await graph.setLayout("ngraph");

        // Wait for the view change and the layout to finish on the queue
        await graph.waitForSettled();

        // Get the camera controller
        const cameraManager = graph.camera;
        cameraController = (cameraManager as unknown as { activeCameraController: TwoDCameraController })
            .activeCameraController;
        assert.isDefined(cameraController, "Camera controller should be defined after switching to 2D mode");

        // Access the input controller through camera manager
        inputController = (cameraManager as unknown as { activeInputHandler: InputController }).activeInputHandler;
        assert.isDefined(inputController, "Input controller should be defined");
    });

    afterEach(async () => {
        await releaseHeldKeys();
        cleanupTestGraph(graph);
    });

    test("mouse pan updates camera position", async () => {
        const initialPos = new Vector3(
            cameraController.camera.position.x,
            cameraController.camera.position.y,
            cameraController.camera.position.z,
        );

        // A real drag across the canvas
        await drag(graph.canvas, { x: 100, y: 100 }, { x: 200, y: 150 });

        // Camera position should have changed
        assert.notEqual(cameraController.camera.position.x, initialPos.x);
        assert.notEqual(cameraController.camera.position.y, initialPos.y);
    });

    test("keyboard WASD controls update velocity", async () => {
        graph.canvas.focus();

        // Test W key (up)
        await holdKey("w");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.y > 0, "W key should increase Y velocity");

        // Release, press the next key, reset and test S key (down)
        await releaseKey("w");
        await holdKey("s");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.y < 0, "S key should decrease Y velocity");

        // Release, press the next key, reset and test A key (left)
        await releaseKey("s");
        await holdKey("a");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.x < 0, "A key should decrease X velocity");

        // Release, press the next key, reset and test D key (right)
        await releaseKey("a");
        await holdKey("d");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.x > 0, "D key should increase X velocity");
    });

    test("keyboard arrow keys work like WASD", async () => {
        graph.canvas.focus();

        // Test Arrow Up (like W)
        await holdKey("ArrowUp");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.y > 0, "Arrow Up should increase Y velocity");

        // Release, press the next key, reset and test Arrow Down (like S)
        await releaseKey("ArrowUp");
        await holdKey("ArrowDown");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.y < 0, "Arrow Down should decrease Y velocity");

        // Release, press the next key, reset and test Arrow Left (like A)
        await releaseKey("ArrowDown");
        await holdKey("ArrowLeft");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.x < 0, "Arrow Left should decrease X velocity");

        // Release, press the next key, reset and test Arrow Right (like D)
        await releaseKey("ArrowLeft");
        await holdKey("ArrowRight");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.x > 0, "Arrow Right should increase X velocity");
    });

    test("keyboard zoom controls update zoom velocity", async () => {
        graph.canvas.focus();

        // Test + key (zoom in)
        await holdKey("+");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.zoom < 0, "+ key should decrease zoom velocity (zoom in)");

        // Release, press the next key, reset and test = key (alternative zoom in)
        await releaseKey("+");
        await holdKey("=");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.zoom < 0, "= key should decrease zoom velocity (zoom in)");

        // Release, press the next key, reset and test - key (zoom out)
        await releaseKey("=");
        await holdKey("-");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.zoom > 0, "- key should increase zoom velocity (zoom out)");
    });

    test("keyboard rotation controls Q/E update rotate velocity", async () => {
        graph.canvas.focus();

        // Test Q key (rotate counter-clockwise)
        await holdKey("q");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.rotate > 0, "Q key should increase rotate velocity");

        // Release, press the next key, reset and test E key (rotate clockwise)
        await releaseKey("q");
        await holdKey("e");
        cameraController.velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
        inputController.applyKeyboardInertia();

        assert.isTrue(cameraController.velocity.rotate < 0, "E key should decrease rotate velocity");
    });

    test("mouse wheel zooms camera", async () => {
        const initialOrthoTop = cameraController.camera.orthoTop;
        const initialOrthoBottom = cameraController.camera.orthoBottom;
        const initialZoom = (initialOrthoTop ?? 1) - (initialOrthoBottom ?? -1);

        // A real wheel turn toward the reader (negative deltaY) over the canvas
        await wheel(graph.canvas, { x: 100, y: 100 }, -100);

        await expect
            .poll(() => (cameraController.camera.orthoTop ?? 1) - (cameraController.camera.orthoBottom ?? -1), {
                message: "Negative wheel delta should zoom in (decrease ortho range)",
            })
            .toBeLessThan(initialZoom);
    });

    test("a wheel turn on two axes zooms one step", async () => {
        const range = (): number =>
            (cameraController.camera.orthoTop ?? 1) - (cameraController.camera.orthoBottom ?? -1);
        const before = range();

        // A trackpad turn: Babylon raises one POINTERWHEEL per changed axis (issue #2937)
        await wheel(graph.canvas, { x: 100, y: 100 }, 100, 10);

        await expect.poll(range, { message: "the wheel zoomed out" }).toBeGreaterThan(before);
        assert.closeTo(range() / before, 1.1, 1e-6, "exactly one zoom step of mouseWheelZoomSpeed");
    });

    test("canvas gains focus on pointer down", async () => {
        const { canvas } = graph;

        (document.activeElement as HTMLElement | null)?.blur();
        const focusSpy = vi.spyOn(canvas, "focus");

        // A real click on the canvas
        await click(canvas, { x: 100, y: 100 });

        // Canvas should have been focused. A real click focuses it more than once, on purpose: the
        // render manager focuses on the press and on the release (standing in for Babylon's own
        // handler), and the 2D input controller on the press.
        assert.isAtLeast(focusSpy.mock.calls.length, 1, "the element focused the canvas");
        assert.strictEqual(document.activeElement, canvas, "the canvas has focus");
    });

    test("canvas is made focusable with tabindex", () => {
        const { canvas } = graph;

        // Canvas should have tabindex attribute for keyboard focus
        assert.equal(canvas.getAttribute("tabindex"), "0");
    });

    test("input controller can be enabled and disabled", () => {
        assert.isTrue(
            (inputController as unknown as { enabled: boolean }).enabled,
            "Input controller should start enabled",
        );

        inputController.disable();
        assert.isFalse(
            (inputController as unknown as { enabled: boolean }).enabled,
            "Input controller should be disabled",
        );

        inputController.enable();
        assert.isTrue(
            (inputController as unknown as { enabled: boolean }).enabled,
            "Input controller should be re-enabled",
        );
    });

    test("keyboard input has no effect when disabled", async () => {
        graph.canvas.focus();

        // Disable input controller
        inputController.disable();

        // Try keyboard input
        await holdKey("w");
        inputController.applyKeyboardInertia();

        // Velocity should remain zero
        assert.equal(cameraController.velocity.y, 0, "Keyboard input should have no effect when disabled");
    });

    test("velocity components start at zero", () => {
        assert.equal(cameraController.velocity.x, 0);
        assert.equal(cameraController.velocity.y, 0);
        assert.equal(cameraController.velocity.zoom, 0);
        assert.equal(cameraController.velocity.rotate, 0);
    });
});
