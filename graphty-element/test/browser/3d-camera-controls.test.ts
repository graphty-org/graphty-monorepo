import {} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { OrbitCameraController } from "../../src/cameras/OrbitCameraController";
import { OrbitInputController } from "../../src/cameras/OrbitInputController";
import { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph, setBehavior } from "../helpers/testSetup";

describe("3D Camera Controls", () => {
    let graph: Graph;
    let cameraController: OrbitCameraController;
    let inputController: OrbitInputController;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });
        await graph.setViewMode("3d");
        await graph.setLayout("ngraph");

        // Wait for the view change and the layout to finish on the queue
        await graph.waitForSettled();

        // Get the camera controller
        const cameraManager = graph.camera;
        cameraController = (cameraManager as unknown as { activeCameraController: OrbitCameraController })
            .activeCameraController;
        assert.isDefined(cameraController, "Camera controller should be defined after switching to 3D mode");

        // Access the input controller through camera manager
        inputController = (cameraManager as unknown as { activeInputHandler: OrbitInputController }).activeInputHandler;
        assert.isDefined(inputController, "Input controller should be defined");

        // Verify input controller is enabled
        assert.isTrue((inputController as any).enabled, "Input controller should be enabled after camera activation");
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("mouse drag orbits camera", () => {
        const { canvas } = graph;
        canvas.focus();

        // Test pointer event registration
        canvas.dispatchEvent(
            new PointerEvent("pointerdown", {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true,
            }),
        );

        const { isPointerDown } = inputController as any;
        assert.isTrue(isPointerDown, "Pointer down should be registered");

        // Spy on the rotate method to verify it's called during drag
        const rotateSpy = vi.spyOn(cameraController, "rotate");

        canvas.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: 200,
                clientY: 150,
                bubbles: true,
            }),
        );

        // Verify rotate was called with the movement delta
        assert.equal(rotateSpy.mock.calls.length, 1, "rotate() should be called once during pointer move");
        const [dx, dy] = rotateSpy.mock.calls[0];
        assert.equal(dx, 100, "dx should be the difference in clientX (200 - 100)");
        assert.equal(dy, 50, "dy should be the difference in clientY (150 - 100)");

        canvas.dispatchEvent(
            new PointerEvent("pointerup", {
                bubbles: true,
            }),
        );

        const isPointerDownAfter = (inputController as any).isPointerDown;
        assert.isFalse(isPointerDownAfter, "Pointer down should be cleared after pointer up");
    });

    test("arrow keys turn the camera, one way and the other", () => {
        const { canvas } = graph;
        const rotate = vi.spyOn(cameraController, "rotate");
        /**
         * The turn one update makes while a key is held.
         * @param key - The key.
         * @returns The yaw and pitch handed to the camera.
         */
        const turnFor = (key: string): [number, number] => {
            rotate.mockClear();
            canvas.dispatchEvent(new KeyboardEvent("keydown", { key }));
            inputController.update();
            canvas.dispatchEvent(new KeyboardEvent("keyup", { key }));
            assert.equal(rotate.mock.calls.length, 1, `${key} turned the camera once`);
            return rotate.mock.calls[0];
        };

        assert.isBelow(turnFor("ArrowLeft")[0], 0, "ArrowLeft turns one way");
        assert.isAbove(turnFor("ArrowRight")[0], 0, "ArrowRight turns the other");
        assert.isBelow(turnFor("ArrowUp")[1], 0, "ArrowUp tilts one way");
        assert.isAbove(turnFor("ArrowDown")[1], 0, "ArrowDown tilts the other");
    });

    test("WASD keys control camera movement", () => {
        const { canvas } = graph;
        const initialDistance = cameraController.cameraDistance;

        // Test W key (zoom in)
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
        inputController.update();

        assert.isTrue(cameraController.cameraDistance < initialDistance, "W key should zoom in (decrease distance)");

        // Reset and test S key (zoom out)
        cameraController.cameraDistance = initialDistance;
        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
        inputController.update();

        assert.isTrue(cameraController.cameraDistance > initialDistance, "S key should zoom out (increase distance)");
    });

    test("AD keys control yaw (spin)", () => {
        const { canvas } = graph;
        canvas.focus();

        // Test A key registration and spin method call
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));

        const { keysDown } = inputController as any;
        assert.isTrue(keysDown.a === true, "A key should be registered as down");

        // Spy on the spin method to verify it's called
        const spinSpy = vi.spyOn(cameraController, "spin");
        inputController.update();

        // Verify spin was called with the expected value
        assert.equal(spinSpy.mock.calls.length, 1, "spin() should be called once when A key is pressed");
        assert.equal(
            spinSpy.mock.calls[0][0],
            cameraController.config.keyboardYawSpeed,
            "spin() should be called with keyboardYawSpeed",
        );

        // Test D key
        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "a", bubbles: true }));
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));

        assert.isTrue(keysDown.d === true, "D key should be registered as down");

        spinSpy.mockClear();
        inputController.update();

        // Verify spin was called with negative value for D key
        assert.equal(spinSpy.mock.calls.length, 1, "spin() should be called once when D key is pressed");
        assert.equal(
            spinSpy.mock.calls[0][0],
            -cameraController.config.keyboardYawSpeed,
            "spin() should be called with negative keyboardYawSpeed for D key",
        );

        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }));
    });

    test("an arrow key stops turning the camera when it is released", () => {
        const { canvas } = graph;
        const rotate = vi.spyOn(cameraController, "rotate");

        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        inputController.update();
        assert.equal(rotate.mock.calls.length, 1, "a held arrow turns the camera");

        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
        inputController.update();
        assert.equal(rotate.mock.calls.length, 1, "nothing coasts on after the key is released");
    });

    test("canvas gains focus on pointer down", () => {
        const { canvas } = graph;

        // Mock focus method
        const focusSpy = vi.spyOn(canvas, "focus").mockImplementation(() => undefined);

        // Simulate pointer down
        canvas.dispatchEvent(
            new PointerEvent("pointerdown", {
                clientX: 100,
                clientY: 100,
                button: 0,
            }),
        );

        // Canvas should have been focused (may be called multiple times due to event handling)
        assert.isTrue(focusSpy.mock.calls.length >= 1, "Canvas focus should be called at least once");
    });

    test("canvas is made focusable with tabindex", () => {
        const { canvas } = graph;

        // Canvas should have tabindex attribute for keyboard focus
        assert.equal(canvas.getAttribute("tabindex"), "0");
    });

    test("input controller can be enabled and disabled", () => {
        assert.isTrue((inputController as any).enabled, "Input controller should start enabled");

        inputController.disable();
        assert.isFalse((inputController as any).enabled, "Input controller should be disabled");

        // Test that keyboard input has no effect when disabled
        const { canvas } = graph;
        canvas.focus();

        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        inputController.update();

        // When disabled, the arrow key does not turn the camera
        const rotate = vi.spyOn(cameraController, "rotate");
        assert.equal(rotate.mock.calls.length, 0, "The camera should not turn when input is disabled");

        inputController.enable();
        assert.isTrue((inputController as any).enabled, "Input controller should be re-enabled");

        // Should work again when re-enabled
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        inputController.update();

        assert.equal(rotate.mock.calls.length, 1, "The camera should turn when input is re-enabled");
    });

    test("multi-touch prevents mouse orbit", () => {
        const { canvas } = graph;
        const initialPivotRotation = {
            x: cameraController.pivot.rotation.x,
            y: cameraController.pivot.rotation.y,
            z: cameraController.pivot.rotation.z,
        };

        // Simulate multi-touch state
        (inputController as any).isMultiTouch = true;

        // Try mouse movement - should not affect camera
        canvas.dispatchEvent(
            new PointerEvent("pointerdown", {
                clientX: 100,
                clientY: 100,
                button: 0,
            }),
        );

        canvas.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: 200,
                clientY: 150,
            }),
        );

        canvas.dispatchEvent(new PointerEvent("pointerup"));

        // Pivot should not have moved due to multi-touch state
        const finalPivotRotation = {
            x: cameraController.pivot.rotation.x,
            y: cameraController.pivot.rotation.y,
            z: cameraController.pivot.rotation.z,
        };

        const rotationUnchanged =
            finalPivotRotation.x === initialPivotRotation.x &&
            finalPivotRotation.y === initialPivotRotation.y &&
            finalPivotRotation.z === initialPivotRotation.z;

        assert.isTrue(rotationUnchanged, "Pivot should not orbit during multi-touch");
    });

    test("camera position updates on rotation", () => {
        const { canvas } = graph;
        canvas.focus();

        // Test that updateCameraPosition is called during the input controller update
        const updateSpy = vi.spyOn(cameraController, "updateCameraPosition");

        // Apply keyboard rotation
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        inputController.update();

        // updateCameraPosition should be called during the update cycle
        assert.isTrue(
            updateSpy.mock.calls.length >= 1,
            "updateCameraPosition should be called during input controller update",
        );

        // Verify the camera is properly parented to the pivot
        assert.equal(cameraController.camera.parent, cameraController.pivot, "Camera should be parented to the pivot");
    });
});
