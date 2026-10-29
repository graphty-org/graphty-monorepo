/**
 * Input Speed and Sensitivity Tests
 *
 * These tests verify that input sensitivity, speed settings, and inertia behaviors
 * work correctly. They catch issues where controls feel "too fast" or "too slow"
 * or where inertia doesn't decay properly.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import type { OrbitCameraController } from "../../../src/cameras/OrbitCameraController";
import type { OrbitInputController } from "../../../src/cameras/OrbitInputController";
import type { TwoDCameraController } from "../../../src/cameras/TwoDCameraController";
import type { InputController } from "../../../src/cameras/TwoDInputController";
import type { Graph } from "../../../src/Graph";
import { holdKey, releaseHeldKeys, releaseKey } from "../../helpers/real-input";
import { getCameraPosition, getSceneScale, setupTestGraph, teardownTestGraph } from "../helpers/interaction-helpers";

/**
 * Helper to get the 2D camera controller and input controller from a graph
 */
function get2DControllers(graph: Graph): {
    cameraController: TwoDCameraController;
    inputController: InputController;
} {
    const controller = graph.camera.getActiveController() as TwoDCameraController;
    const { inputs } = graph.camera as unknown as {
        inputs: Map<string, InputController>;
    };
    const maybeInput = inputs.get("2d");
    if (!maybeInput) {
        throw new Error("2D input controller not found");
    }

    return { cameraController: controller, inputController: maybeInput };
}

/**
 * Helper to get the 3D camera controller and input controller from a graph
 */
function get3DControllers(graph: Graph): {
    cameraController: OrbitCameraController;
    inputController: OrbitInputController;
} {
    const controller = graph.camera.getActiveController() as OrbitCameraController;
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
function runUpdateFrames(inputController: InputController | OrbitInputController, frames: number): void {
    for (let i = 0; i < frames; i++) {
        inputController.update();
    }
}

describe("Input Speed and Sensitivity", () => {
    describe("2D Mode Keyboard Speed", () => {
        let graph: Graph;

        beforeEach(async () => {
            graph = await setupTestGraph({ mode: "2d" });
        });

        afterEach(async () => {
            await releaseHeldKeys();
            vi.restoreAllMocks();
            teardownTestGraph(graph);
        });

        test("keyboard pan speed is within expected range", async () => {
            const { inputController } = get2DControllers(graph);

            // Record initial position
            const initialPos = getCameraPosition(graph);

            // Simulate W key press for fixed number of frames
            await pressKey(graph, "w");
            const frames = 10;
            runUpdateFrames(inputController, frames);
            await releaseKey("w");

            // Get final position
            const finalPos = getCameraPosition(graph);

            // Calculate distance moved
            const distance = Math.abs(finalPos.y - initialPos.y);

            // Verify movement is detectable but not excessive
            // The exact values depend on config, but should be reasonable
            assert.isAbove(distance, 0.001, "Pan speed should produce detectable movement");
            assert.isBelow(distance, 100, "Pan speed should not be excessively fast");
        });

        test("keyboard zoom speed is within expected range", async () => {
            const { inputController } = get2DControllers(graph);

            // Record initial scale
            const initialScale = getSceneScale(graph);
            // The render loop also steps the input controller every frame while the real key is
            // down, as many frames as pressing and releasing it happens to take: stop it, so the
            // zoom moves by exactly the frames run below.
            graph.engine.stopRenderLoop();

            // Simulate + key press for fixed number of frames
            await pressKey(graph, "+");
            const frames = 10;
            runUpdateFrames(inputController, frames);
            await releaseKey("+");

            // Get final scale
            const finalScale = getSceneScale(graph);

            // Calculate scale change
            const scaleRatio = finalScale / initialScale;

            // Verify zoom is detectable but not excessive
            // Zoom in should increase scale ratio above 1
            assert.isAbove(scaleRatio, 1.0, "Zoom in should increase scale");
            assert.isBelow(scaleRatio, 10, "Zoom speed should not be excessively fast");
        });

        test("mouse drag sensitivity is proportional to movement", () => {
            const { cameraController } = get2DControllers(graph);

            // Record initial position
            const initialPos = getCameraPosition(graph);

            // Apply small pan
            const smallPan = 0.1;
            cameraController.pan(smallPan, 0);
            const posAfterSmallPan = getCameraPosition(graph);
            const smallDelta = posAfterSmallPan.x - initialPos.x;

            // Apply large pan (10x)
            cameraController.pan(smallPan * 9, 0); // Add 9 more for total of 10x
            const posAfterLargePan = getCameraPosition(graph);
            const largeDelta = posAfterLargePan.x - initialPos.x;

            // Large pan should produce approximately 10x the movement
            const ratio = largeDelta / smallDelta;
            assert.closeTo(ratio, 10, 1, "Pan sensitivity should be proportional to movement");
        });

        test("wheel zoom step size is consistent", () => {
            const { cameraController } = get2DControllers(graph);

            // Record initial scale
            const initialScale = getSceneScale(graph);

            // Apply first zoom
            const zoomFactor = 1.1;
            cameraController.zoom(zoomFactor);
            const scaleAfterFirst = getSceneScale(graph);
            const firstChange = scaleAfterFirst / initialScale;

            // Apply second identical zoom
            cameraController.zoom(zoomFactor);
            const scaleAfterSecond = getSceneScale(graph);
            const secondChange = scaleAfterSecond / scaleAfterFirst;

            // Each zoom step should produce the same proportional change
            assert.closeTo(firstChange, secondChange, 0.01, "Zoom steps should be consistent");
        });

        test("keyboard inertia decays at expected rate", () => {
            const { cameraController } = get2DControllers(graph);

            // Apply velocity directly
            cameraController.velocity.x = 1.0;

            // Get the damping factor from config
            const dampingFactor = cameraController.config.panDamping;

            // Run one frame of inertia
            cameraController.applyInertia();

            // Verify velocity decayed by damping factor
            assert.closeTo(
                cameraController.velocity.x,
                1.0 * dampingFactor,
                0.0001,
                "Velocity should decay by damping factor each frame",
            );
        });

        test("rotation velocity dampens correctly when key released", () => {
            const { cameraController } = get2DControllers(graph);

            // Apply rotation velocity
            cameraController.velocity.rotate = 0.1;

            // Get the damping factor from config
            const dampingFactor = cameraController.config.rotateDamping;

            // Run several frames without key pressed
            const frames = 5;
            for (let i = 0; i < frames; i++) {
                cameraController.applyInertia();
            }

            // Velocity should have decayed by damping factor raised to power of frames
            const expectedVelocity = 0.1 * Math.pow(dampingFactor, frames);
            assert.closeTo(
                cameraController.velocity.rotate,
                expectedVelocity,
                0.0001,
                "Rotation velocity should decay exponentially",
            );
        });
    });

    describe("3D Mode Keyboard Speed", () => {
        let graph: Graph;

        beforeEach(async () => {
            graph = await setupTestGraph({ mode: "3d" });
        });

        afterEach(async () => {
            await releaseHeldKeys();
            vi.restoreAllMocks();
            teardownTestGraph(graph);
        });

        test("keyboard zoom speed is within expected range", async () => {
            const { cameraController, inputController } = get3DControllers(graph);

            // Record initial distance
            const initialDistance = cameraController.cameraDistance;

            // Simulate W key press for fixed number of frames
            await pressKey(graph, "w");
            const frames = 10;
            runUpdateFrames(inputController, frames);
            await releaseKey("w");

            // Get final distance
            const finalDistance = cameraController.cameraDistance;

            // Calculate distance change
            const distanceChange = Math.abs(finalDistance - initialDistance);

            // Verify zoom is detectable but not excessive
            assert.isAbove(distanceChange, 0.01, "Zoom speed should produce detectable movement");
            assert.isBelow(distanceChange, initialDistance, "Zoom speed should not be excessively fast");
        });

        test("mouse wheel zooms the camera in and out", () => {
            const { cameraController } = get3DControllers(graph);
            const wheel = (deltaY: number): boolean =>
                graph.canvas.dispatchEvent(new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }));

            const start = cameraController.cameraDistance;
            assert.isFalse(wheel(-100), "the wheel must not scroll the page");
            const zoomedIn = cameraController.cameraDistance;
            assert.isBelow(zoomedIn, start * 0.95, "wheel up should move the camera closer");
            assert.isAbove(zoomedIn, start * 0.5, "one notch should not jump the camera");

            wheel(100);
            assert.isAbove(cameraController.cameraDistance, zoomedIn, "wheel down should move the camera away");
        });

        test("keyboard rotation speed is within expected range", async () => {
            const { cameraController, inputController } = get3DControllers(graph);

            // Record initial pivot rotation
            const { pivot } = cameraController;
            const initialRotation = pivot.rotationQuaternion?.toEulerAngles().y ?? 0;

            // Simulate ArrowLeft key press for fixed number of frames
            await pressKey(graph, "ArrowLeft");
            const frames = 10;
            runUpdateFrames(inputController, frames);
            await releaseKey("ArrowLeft");

            // Get final rotation
            const finalRotation = pivot.rotationQuaternion?.toEulerAngles().y ?? 0;

            // Calculate rotation change (in radians)
            const rotationChange = Math.abs(finalRotation - initialRotation);

            // Verify rotation is detectable but not excessive
            // Should rotate less than 180 degrees in 10 frames
            assert.isAbove(rotationChange, 0.001, "Rotation speed should produce detectable movement");
            assert.isBelow(rotationChange, Math.PI, "Rotation speed should not be excessively fast");
        });
    });

    describe("Mouse Sensitivity", () => {
        let graph: Graph;

        beforeEach(async () => {
            graph = await setupTestGraph({ mode: "3d" });
        });

        afterEach(async () => {
            await releaseHeldKeys();
            vi.restoreAllMocks();
            teardownTestGraph(graph);
        });

        test("mouse drag rotation is proportional to pixel movement", () => {
            const { cameraController } = get3DControllers(graph);

            // Record initial rotation
            const { pivot } = cameraController;
            const initialYaw = pivot.rotationQuaternion?.toEulerAngles().y ?? 0;

            // Apply small rotation
            const smallDx = 10;
            cameraController.rotate(smallDx, 0);
            const yawAfterSmall = pivot.rotationQuaternion?.toEulerAngles().y ?? 0;
            const smallDelta = yawAfterSmall - initialYaw;

            // Apply larger rotation (3x)
            cameraController.rotate(smallDx * 2, 0);
            const yawAfterLarge = pivot.rotationQuaternion?.toEulerAngles().y ?? 0;
            const largeDelta = yawAfterLarge - initialYaw;

            // Large movement should produce approximately 3x the rotation
            // (accounting for the accumulated small delta)
            const ratio = largeDelta / smallDelta;
            assert.closeTo(ratio, 3, 0.5, "Rotation should be proportional to mouse movement");
        });
    });
});
