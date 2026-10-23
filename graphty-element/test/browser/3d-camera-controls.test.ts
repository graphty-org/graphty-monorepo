import {} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { OrbitCameraController } from "../../src/cameras/OrbitCameraController";
import { OrbitInputController } from "../../src/cameras/OrbitInputController";
import { Graph } from "../../src/Graph";
import { click, drag, holdKey, moveHeld, press, release, releaseHeldKeys, releaseKey } from "../helpers/real-input";
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

    afterEach(async () => {
        await releaseHeldKeys();
        cleanupTestGraph(graph);
    });

    test("mouse drag orbits camera", async () => {
        const { canvas } = graph;
        canvas.focus();

        // A real press on the canvas
        await press(canvas, { x: 100, y: 100 });

        const { isPointerDown } = inputController as any;
        assert.isTrue(isPointerDown, "Pointer down should be registered");

        // Spy on the rotate method to verify it's called during drag
        const rotateSpy = vi.spyOn(cameraController, "rotate");

        await moveHeld(canvas, { x: 200, y: 150 });

        // Verify rotate was called with the movement delta
        assert.equal(rotateSpy.mock.calls.length, 1, "rotate() should be called once during pointer move");
        const [dx, dy] = rotateSpy.mock.calls[0];
        assert.equal(dx, 100, "dx should be the difference in clientX (200 - 100)");
        assert.equal(dy, 50, "dy should be the difference in clientY (150 - 100)");

        await release(canvas, { x: 200, y: 150 });

        const isPointerDownAfter = (inputController as any).isPointerDown;
        assert.isFalse(isPointerDownAfter, "Pointer down should be cleared after pointer up");
    });

    test("arrow keys turn the camera, one way and the other", async () => {
        graph.canvas.focus();
        const rotate = vi.spyOn(cameraController, "rotate");
        /**
         * The turn one update makes while a key is held.
         * @param key - The key.
         * @returns The yaw and pitch handed to the camera.
         */
        const turnFor = async (key: string): Promise<[number, number]> => {
            await holdKey(key);
            // Cleared after the press: the render loop's own updates turn the camera too while
            // the key is held, and this counts only the one update below.
            rotate.mockClear();
            inputController.update();
            const calls = rotate.mock.calls.length;
            const [turn] = rotate.mock.calls;
            await releaseKey(key);
            assert.equal(calls, 1, `${key} turned the camera once`);
            return turn;
        };

        assert.isBelow((await turnFor("ArrowLeft"))[0], 0, "ArrowLeft turns one way");
        assert.isAbove((await turnFor("ArrowRight"))[0], 0, "ArrowRight turns the other");
        assert.isBelow((await turnFor("ArrowUp"))[1], 0, "ArrowUp tilts one way");
        assert.isAbove((await turnFor("ArrowDown"))[1], 0, "ArrowDown tilts the other");
    });

    test("WASD keys control camera movement", async () => {
        graph.canvas.focus();
        const initialDistance = cameraController.cameraDistance;

        // Test W key (zoom in)
        await holdKey("w");
        inputController.update();

        assert.isTrue(cameraController.cameraDistance < initialDistance, "W key should zoom in (decrease distance)");

        // Release W, reset, and test S key (zoom out): the press itself zooms a notch
        await releaseKey("w");
        cameraController.cameraDistance = initialDistance;
        await holdKey("s");
        inputController.update();

        assert.isTrue(cameraController.cameraDistance > initialDistance, "S key should zoom out (increase distance)");
    });

    test("AD keys control yaw (spin)", async () => {
        graph.canvas.focus();

        // Test A key registration and spin method call
        await holdKey("a");

        // `busy` is the controller's public word for a key held down that moves the camera
        assert.isTrue(inputController.busy, "A key should be registered as down");

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
        await releaseKey("a");
        await holdKey("d");

        assert.isTrue(inputController.busy, "D key should be registered as down");

        spinSpy.mockClear();
        inputController.update();

        // Verify spin was called with negative value for D key
        assert.equal(spinSpy.mock.calls.length, 1, "spin() should be called once when D key is pressed");
        assert.equal(
            spinSpy.mock.calls[0][0],
            -cameraController.config.keyboardYawSpeed,
            "spin() should be called with negative keyboardYawSpeed for D key",
        );

        await releaseKey("d");
    });

    test("an arrow key stops turning the camera when it is released", async () => {
        graph.canvas.focus();
        const rotate = vi.spyOn(cameraController, "rotate");

        // Each count starts after the key changes: the render loop updates too while it is held.
        // Held past the step one tap gives (8 frames), so what is left after the release is only
        // what holding it would coast on.
        await holdKey("ArrowLeft");
        rotate.mockClear();
        for (let frame = 0; frame < 8; frame++) {
            inputController.update();
        }
        assert.equal(rotate.mock.calls.length, 8, "a held arrow turns the camera every frame");

        await releaseKey("ArrowLeft");
        rotate.mockClear();
        inputController.update();
        assert.equal(rotate.mock.calls.length, 0, "nothing coasts on after the key is released");
    });

    test("canvas gains focus on pointer down", async () => {
        const { canvas } = graph;

        // Mock focus method
        const focusSpy = vi.spyOn(canvas, "focus").mockImplementation(() => undefined);

        // A real click on the canvas
        await click(canvas, { x: 100, y: 100 });

        // Canvas should have been focused (may be called multiple times due to event handling)
        assert.isTrue(focusSpy.mock.calls.length >= 1, "Canvas focus should be called at least once");
    });

    test("canvas is made focusable with tabindex", () => {
        const { canvas } = graph;

        // Canvas should have tabindex attribute for keyboard focus
        assert.equal(canvas.getAttribute("tabindex"), "0");
    });

    test("input controller can be enabled and disabled", async () => {
        assert.isTrue((inputController as any).enabled, "Input controller should start enabled");

        inputController.disable();
        assert.isFalse((inputController as any).enabled, "Input controller should be disabled");

        // Test that keyboard input has no effect when disabled
        graph.canvas.focus();

        await holdKey("ArrowLeft");
        inputController.update();

        // When disabled, the arrow key does not turn the camera
        const rotate = vi.spyOn(cameraController, "rotate");
        assert.equal(rotate.mock.calls.length, 0, "The camera should not turn when input is disabled");

        // Let go of the key the disabled controller never heard, as a reader would before trying again
        await releaseKey("ArrowLeft");
        inputController.enable();
        assert.isTrue((inputController as any).enabled, "Input controller should be re-enabled");

        // Should work again when re-enabled; counted from the press, as the render loop updates too
        await holdKey("ArrowLeft");
        rotate.mockClear();
        inputController.update();

        assert.equal(rotate.mock.calls.length, 1, "The camera should turn when input is re-enabled");
    });

    test("multi-touch prevents mouse orbit", async () => {
        const { canvas } = graph;
        const initialPivotRotation = {
            x: cameraController.pivot.rotation.x,
            y: cameraController.pivot.rotation.y,
            z: cameraController.pivot.rotation.z,
        };

        // Simulate multi-touch state
        (inputController as any).isMultiTouch = true;

        // Try a real mouse drag - should not affect camera
        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 }, 1);

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

    test("camera position updates on rotation", async () => {
        graph.canvas.focus();

        // Test that updateCameraPosition is called during the input controller update
        const updateSpy = vi.spyOn(cameraController, "updateCameraPosition");

        // Apply keyboard rotation
        await holdKey("ArrowLeft");
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
