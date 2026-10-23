/**
 * 3D Input Direction Verification Tests
 *
 * These tests verify that input directions map to expected output directions
 * in 3D camera mode. They are critical for catching direction-related regressions.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import type { OrbitCameraController } from "../../../src/cameras/OrbitCameraController";
import type { OrbitInputController } from "../../../src/cameras/OrbitInputController";
import type { Graph } from "../../../src/Graph";
import { holdKey, releaseHeldKeys } from "../../helpers/real-input";
import { setupTestGraph, teardownTestGraph } from "../helpers/interaction-helpers";

/**
 * Helper to get the 3D camera controller and input controller from a graph
 */
function get3DControllers(graph: Graph): {
    cameraController: OrbitCameraController;
    inputController: OrbitInputController;
} {
    const controller = graph.camera.getActiveController() as OrbitCameraController;
    // Access input controller via the camera manager's internal inputs map
    const { inputs } = graph.camera as unknown as {
        inputs: Map<string, OrbitInputController>;
    };
    const maybeInput = inputs.get("orbit");
    if (!maybeInput) {
        throw new Error("3D (orbit) input controller not found");
    }

    return { cameraController: controller, inputController: maybeInput };
}

/**
 * Press a key and hold it on the focused canvas: a real key press through `userEvent`, which
 * the input controller's own listeners receive. `releaseHeldKeys` lets it go after the test.
 */
async function pressKey(graph: Graph, key: string): Promise<void> {
    graph.canvas.focus();
    await holdKey(key);
}

/**
 * Helper to run multiple update frames
 */
function runUpdateFrames(inputController: OrbitInputController, frames: number): void {
    for (let i = 0; i < frames; i++) {
        inputController.update();
    }
}

/**
 * Helper to get pivot rotation (yaw/pitch) from the orbit camera controller
 */
function getPivotRotation(cameraController: OrbitCameraController): { yaw: number; pitch: number; roll: number } {
    const { pivot } = cameraController;
    if (!pivot.rotationQuaternion) {
        return { yaw: pivot.rotation.y, pitch: pivot.rotation.x, roll: pivot.rotation.z };
    }

    // Convert quaternion to Euler angles
    const euler = pivot.rotationQuaternion.toEulerAngles();
    return {
        yaw: euler.y,
        pitch: euler.x,
        roll: euler.z,
    };
}

describe("3D Input Direction Verification", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await setupTestGraph({ mode: "3d" });
    });

    afterEach(async () => {
        await releaseHeldKeys();
        vi.restoreAllMocks();
        teardownTestGraph(graph);
    });

    test("ArrowLeft rotates camera LEFT (decreases yaw)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate ArrowLeft key press
        await pressKey(graph, "ArrowLeft");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // A held ArrowLeft calls rotate(-keyboardRotationSpeed / trackballRotationSpeed, 0) each
        // frame, and a negative dx decreases yaw
        assert.isBelow(finalRotation.yaw, initialRotation.yaw, "ArrowLeft should rotate camera LEFT (decrease yaw)");
    });

    test("ArrowRight rotates camera RIGHT (increases yaw)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate ArrowRight key press
        await pressKey(graph, "ArrowRight");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // A held ArrowRight calls rotate with a positive dx each frame, which increases yaw
        assert.isAbove(finalRotation.yaw, initialRotation.yaw, "ArrowRight should rotate camera RIGHT (increase yaw)");
    });

    test("ArrowUp tilts camera UP", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate ArrowUp key press
        await pressKey(graph, "ArrowUp");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // A held ArrowUp calls rotate(0, -keyboardRotationSpeed / trackballRotationSpeed) each
        // frame: a negative dy, which tilts the camera up
        assert.notEqual(finalRotation.pitch, initialRotation.pitch, "ArrowUp should tilt camera UP (change pitch)");
    });

    test("ArrowDown tilts camera DOWN", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate ArrowDown key press
        await pressKey(graph, "ArrowDown");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // A held ArrowDown calls rotate with a positive dy each frame, which tilts the camera down
        assert.notEqual(finalRotation.pitch, initialRotation.pitch, "ArrowDown should tilt camera DOWN (change pitch)");
    });

    test("W key zooms IN (decreases camera distance)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial camera distance
        const initialDistance = cameraController.cameraDistance;

        // Simulate W key press
        await pressKey(graph, "w");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final distance
        const finalDistance = cameraController.cameraDistance;

        // W multiplies the distance by (1 - keyboardZoomSpeed) each frame = zoom in
        assert.isBelow(finalDistance, initialDistance, "W key should zoom IN (decrease camera distance)");
    });

    test("S key zooms OUT (increases camera distance)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial camera distance
        const initialDistance = cameraController.cameraDistance;

        // Simulate S key press
        await pressKey(graph, "s");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final distance
        const finalDistance = cameraController.cameraDistance;

        // S divides the distance by (1 - keyboardZoomSpeed) each frame = zoom out
        assert.isAbove(finalDistance, initialDistance, "S key should zoom OUT (increase camera distance)");
    });

    test("A key spins camera LEFT (yaw rotation)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate A key press
        await pressKey(graph, "a");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // Looking at OrbitInputController.ts lines 167-168:
        // if (keys.a) { cam.spin(this.config.keyboardYawSpeed); }
        // spin() with positive delta spins left (positive roll/z rotation)
        assert.isAbove(finalRotation.roll, initialRotation.roll, "A key should spin camera LEFT (increase roll)");
    });

    test("D key spins camera RIGHT (yaw rotation)", async () => {
        const { cameraController, inputController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate D key press
        await pressKey(graph, "d");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // Looking at OrbitInputController.ts lines 171-172:
        // if (keys.d) { cam.spin(-this.config.keyboardYawSpeed); }
        // spin() with negative delta spins right (negative roll/z rotation)
        assert.isBelow(finalRotation.roll, initialRotation.roll, "D key should spin camera RIGHT (decrease roll)");
    });

    test("mouse drag RIGHT rotates camera RIGHT", () => {
        const { cameraController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate mouse drag to the RIGHT (positive dx)
        // Looking at OrbitInputController.ts line 43:
        // this.controller.rotate(dx, dy);
        // And in OrbitCameraController.ts (after XR convention fix):
        // this.pivotController.rotate(dx * trackballRotationSpeed, -dy * trackballRotationSpeed);
        // So dx > 0 means rotate with positive dx*speed = positive yaw delta = turn right
        const dx = 50;
        cameraController.rotate(dx, 0);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // Drag RIGHT should rotate camera RIGHT (increase yaw with XR convention)
        assert.isAbove(
            finalRotation.yaw,
            initialRotation.yaw,
            "Mouse drag RIGHT should rotate camera RIGHT (increase yaw)",
        );
    });

    test("mouse drag DOWN tilts camera DOWN", () => {
        const { cameraController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate mouse drag DOWN (positive dy in screen coords)
        const dy = 50;
        cameraController.rotate(0, dy);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // Drag DOWN should tilt camera DOWN (looking down)
        assert.notEqual(
            finalRotation.pitch,
            initialRotation.pitch,
            "Mouse drag DOWN should tilt camera DOWN (change pitch)",
        );
    });

    test("pinch spread zooms IN (smaller camera distance)", () => {
        const { cameraController } = get3DControllers(graph);

        // Record initial camera distance
        const initialDistance = cameraController.cameraDistance;

        // A pinch maps the change in finger gap onto a zoom; a spread is a negative delta = zoom in
        const scaleDelta = 0.5; // spread
        const pinchSensitivity = 10; // typical sensitivity
        cameraController.zoom(-scaleDelta * pinchSensitivity);

        // Get final distance
        const finalDistance = cameraController.cameraDistance;

        // Pinch spread should zoom IN (decrease distance)
        assert.isBelow(finalDistance, initialDistance, "Pinch spread should zoom IN (decrease camera distance)");
    });

    test("pinch squeeze zooms OUT (larger camera distance)", () => {
        const { cameraController } = get3DControllers(graph);

        // Record initial camera distance
        const initialDistance = cameraController.cameraDistance;

        // Simulate pinch squeeze (scale decreases, which maps to positive zoom delta)
        const scaleDelta = -0.5; // squeeze
        const pinchSensitivity = 10;
        cameraController.zoom(-scaleDelta * pinchSensitivity);

        // Get final distance
        const finalDistance = cameraController.cameraDistance;

        // Pinch squeeze should zoom OUT (increase distance)
        assert.isAbove(finalDistance, initialDistance, "Pinch squeeze should zoom OUT (increase camera distance)");
    });

    test("two-finger rotate clockwise spins camera CW", () => {
        const { cameraController } = get3DControllers(graph);

        // Record initial pivot rotation
        const initialRotation = getPivotRotation(cameraController);

        // Simulate two-finger rotate clockwise (rotation increases)
        // Looking at OrbitInputController.ts lines 88-89:
        // const rotationDelta = (ev.rotation - lastRotation) * (Math.PI / 180) * this.config.twistYawSensitivity;
        // this.controller.spin(rotationDelta);
        // Clockwise rotation = positive rotationDelta
        const rotationDelta = Math.PI / 4; // 45 degrees CW
        cameraController.spin(rotationDelta);

        // Get final rotation
        const finalRotation = getPivotRotation(cameraController);

        // Two-finger CW should spin camera CW (positive roll)
        assert.isAbove(
            finalRotation.roll,
            initialRotation.roll,
            "Two-finger rotate CW should spin camera CW (increase roll)",
        );
    });
});
