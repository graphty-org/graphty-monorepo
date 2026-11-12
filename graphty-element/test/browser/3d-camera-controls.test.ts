import {} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { OrbitCameraController } from "../../src/cameras/OrbitCameraController";
import { Graph } from "../../src/Graph";
import {
    click,
    drag,
    holdKey,
    holdPinch,
    hover,
    moveHeld,
    nextFrame,
    press,
    release,
    releaseHeldKeys,
    releaseKey,
} from "../helpers/real-input";
import { cleanupTestGraph, createTestGraph, setBehavior } from "../helpers/testSetup";

describe("3D Camera Controls", () => {
    let graph: Graph;
    let cameraController: OrbitCameraController;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });
        await graph.setViewMode("3d");
        await graph.setLayout("ngraph");

        // Wait for the view change and the layout to finish on the queue
        await graph.waitForSettled();

        const controller = graph.camera.getActiveController();
        assert.instanceOf(controller, OrbitCameraController, "3D mode uses the orbit camera");
        cameraController = controller;
    });

    /**
     * Where the camera is and which way it faces, as `getCameraState` reports it.
     * @returns The camera's position, target, pivot turn and distance.
     */
    const view = (): unknown => {
        const { position, target, pivotRotation, cameraDistance } = graph.getCameraState();
        return { position, target, pivotRotation, cameraDistance };
    };

    afterEach(async () => {
        await releaseHeldKeys();
        cleanupTestGraph(graph);
    });

    test("mouse drag orbits camera", async () => {
        const { canvas } = graph;
        canvas.focus();

        // A real press on the canvas
        await press(canvas, { x: 100, y: 100 });

        // Spy on the rotate method to verify it's called during drag
        const rotateSpy = vi.spyOn(cameraController, "rotate");

        await moveHeld(canvas, { x: 200, y: 150 });

        // Verify rotate was called with the movement delta
        assert.equal(rotateSpy.mock.calls.length, 1, "rotate() should be called once during pointer move");
        const [dx, dy] = rotateSpy.mock.calls[0];
        assert.equal(dx, 100, "dx should be the difference in clientX (200 - 100)");
        assert.equal(dy, 50, "dy should be the difference in clientY (150 - 100)");

        await release(canvas, { x: 200, y: 150 });

        // With the button up, moving the mouse no longer turns the camera
        rotateSpy.mockClear();
        await hover(canvas, { x: 250, y: 120 });
        assert.equal(rotateSpy.mock.calls.length, 0, "a move after the release does not turn the camera");
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
            graph.camera.update();
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

        // Each key is measured over one update counted from after its press: the render loop
        // updates too while the keys change, and a released W still owes the rest of its tap
        // (TAP_FRAMES) until S is pressed, so a distance read before the S press is not a
        // baseline for S (#5129).
        await holdKey("w");
        const beforeW = cameraController.cameraDistance;
        graph.camera.update();
        assert.isBelow(cameraController.cameraDistance, beforeW, "W key should zoom in (decrease distance)");

        await releaseKey("w");
        await holdKey("s");
        const beforeS = cameraController.cameraDistance;
        graph.camera.update();
        assert.isAbove(cameraController.cameraDistance, beforeS, "S key should zoom out (increase distance)");
    });

    test("AD keys control yaw (spin)", async () => {
        graph.canvas.focus();

        // Test A key registration and spin method call
        await holdKey("a");

        // Spy on the spin method to verify it's called
        const spinSpy = vi.spyOn(cameraController, "spin");
        graph.camera.update();

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

        spinSpy.mockClear();
        graph.camera.update();

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
            graph.camera.update();
        }
        assert.equal(rotate.mock.calls.length, 8, "a held arrow turns the camera every frame");

        await releaseKey("ArrowLeft");
        rotate.mockClear();
        graph.camera.update();
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

    test("disabled input does not move the camera, and enabled input does again", async () => {
        const { canvas } = graph;
        canvas.focus();
        // Counted from before any input, so a turn from the render loop's own updates counts too
        const rotate = vi.spyOn(cameraController, "rotate");

        graph.camera.temporarilyDisableInput();
        const before = view();
        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 });
        await holdKey("ArrowLeft");
        graph.camera.update();
        await nextFrame();

        assert.equal(rotate.mock.calls.length, 0, "neither the drag nor the arrow turned the camera");
        assert.deepEqual(view(), before, "the camera did not move while input was disabled");

        // Let go of the key the disabled controller never heard, as a reader would before trying again
        await releaseKey("ArrowLeft");
        graph.camera.temporarilyEnableInput();

        await holdKey("ArrowLeft");
        graph.camera.update();
        assert.isAbove(rotate.mock.calls.length, 0, "the arrow turns the camera once input is enabled");
        assert.notDeepEqual(view(), before, "the camera moved once input was enabled");
    });

    test("a two-finger pinch stops a mouse drag from turning the camera until the fingers lift", async () => {
        const { canvas } = graph;
        const lift = await holdPinch(canvas, { x: 300, y: 100 }, 40, 100);
        const rotate = vi.spyOn(cameraController, "rotate");
        const during = view();

        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 });
        assert.equal(rotate.mock.calls.length, 0, "the mouse did not turn the camera during the pinch");
        assert.deepEqual(view(), during, "the camera stayed put during the pinch");

        await lift();
        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 });
        assert.isAbove(rotate.mock.calls.length, 0, "the mouse turns the camera once the fingers lift");
    });

    test("camera position updates on rotation", async () => {
        graph.canvas.focus();

        const before = graph.getCameraState().position;

        // Apply keyboard rotation
        await holdKey("ArrowLeft");
        graph.camera.update();

        assert.notDeepEqual(graph.getCameraState().position, before, "the arrow moved the camera");

        // Verify the camera is properly parented to the pivot
        assert.equal(cameraController.camera.parent, cameraController.pivot, "Camera should be parented to the pivot");
    });
});
