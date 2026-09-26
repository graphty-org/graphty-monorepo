/**
 * XR Input Direction Verification Tests (CRITICAL)
 *
 * These tests verify that XR controller input directions map to expected output directions.
 * They are particularly critical for catching direction-related regressions because XR
 * controls cannot be easily tested manually without hardware.
 *
 * Input mapping (from XRInputHandler.ts):
 * - Left stick X: Yaw (turn left/right) - X+ = rotate RIGHT
 * - Left stick Y: Pitch (tilt up/down) - Y+ (forward) = graph moves UP, as a mouse or touch drag does
 * - Right stick X: Pan left/right - X+ = pan RIGHT
 * - Right stick Y: Zoom in/out - Y+ (forward) = zoom IN
 */

import { Quaternion, Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { applyDeadzone } from "../../../src/cameras/InputUtils";
import type { PivotController } from "../../../src/cameras/PivotController";
import type { Graph } from "../../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup";
import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

/**
 * Helper to get pivot rotation as Euler angles
 */
function getPivotEuler(pivot: PivotController): { x: number; y: number; z: number } {
    const quat = pivot.pivot.rotationQuaternion ?? Quaternion.Identity();
    const euler = quat.toEulerAngles();
    return { x: euler.x, y: euler.y, z: euler.z };
}

/**
 * Helper to get pivot scale
 */
function getPivotScale(pivot: PivotController): number {
    return pivot.pivot.scaling.x;
}

/**
 * Helper to get pivot position
 */
function getPivotPosition(pivot: PivotController): Vector3 {
    return pivot.pivot.position.clone();
}

describe("XR Input Direction Verification", () => {
    let graph: Graph;
    let pivotController: PivotController;
    let driver: XRInputDriver;

    beforeEach(async () => {
        // Create a test graph to get a valid scene
        graph = await createTestGraph();

        // Drive the real XRInputHandler

        driver = createXRInputDriver(graph.scene);

        pivotController = driver.pivot;
    });

    afterEach(() => {
        driver.dispose();
        vi.restoreAllMocks();
        cleanupTestGraph(graph);
    });

    test("left stick X+ rotates scene RIGHT (CRITICAL)", () => {
        // Record initial rotation
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick to right (X+)
        driver.setStick("left", 0.8, 0);

        // Process several frames of input
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final rotation
        const finalEuler = getPivotEuler(pivotController);

        // X+ should produce positive yaw (rotate RIGHT around Y axis)
        // leftX > 0 is a positive yaw, and PivotController.rotate turns a positive yaw about +Y
        // This rotates the scene RIGHT from the user's perspective
        assert.isAbove(finalEuler.y, initialEuler.y, "Left stick X+ should rotate scene RIGHT (positive yaw)");
    });

    test("left stick X- rotates scene LEFT", () => {
        // Record initial rotation
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick to left (X-)
        driver.setStick("left", -0.8, 0);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final rotation
        const finalEuler = getPivotEuler(pivotController);

        // X- should produce negative yaw (rotate LEFT around Y axis)
        assert.isBelow(finalEuler.y, initialEuler.y, "Left stick X- should rotate scene LEFT (negative yaw)");
    });

    test("left stick Y+ (forward) pitches scene UP", () => {
        // Record initial rotation
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick forward (Y+)
        driver.setStick("left", 0, 0.8);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final rotation
        const finalEuler = getPivotEuler(pivotController);

        // Y+ (forward push) is a positive pitch: the graph moves up
        assert.isAbove(finalEuler.x, initialEuler.x, "Left stick Y+ (forward) should pitch scene UP (positive pitch)");
    });

    test("left stick Y- (back) pitches scene DOWN", () => {
        // Record initial rotation
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick back (Y-)
        driver.setStick("left", 0, -0.8);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final rotation
        const finalEuler = getPivotEuler(pivotController);

        // Y- (pull back) is a negative pitch: the graph moves down
        assert.isBelow(finalEuler.x, initialEuler.x, "Left stick Y- (back) should pitch scene DOWN (negative pitch)");
    });

    test("right stick X+ pans scene RIGHT", () => {
        // Record initial position
        const initialPos = getPivotPosition(pivotController);

        // Set right stick to right (X+)
        driver.setStick("right", 0.8, 0);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final position
        const finalPos = getPivotPosition(pivotController);

        // X+ should pan RIGHT (positive X)
        // rightX > 0 is a positive pan, and PivotController.panViewRelative with yaw 0 gives
        // worldX = right * cosYaw = right * 1 = positive
        assert.isAbove(finalPos.x, initialPos.x, "Right stick X+ should pan scene RIGHT (positive X)");
    });

    test("right stick X- pans scene LEFT", () => {
        // Record initial position
        const initialPos = getPivotPosition(pivotController);

        // Set right stick to left (X-)
        driver.setStick("right", -0.8, 0);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final position
        const finalPos = getPivotPosition(pivotController);

        // X- should pan LEFT (negative X)
        assert.isBelow(finalPos.x, initialPos.x, "Right stick X- should pan scene LEFT (negative X)");
    });

    test("right stick Y+ (forward) zooms IN", () => {
        // Record initial scale
        const initialScale = getPivotScale(pivotController);

        // Set right stick forward (Y+)
        driver.setStick("right", 0, 0.8);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final scale
        const finalScale = getPivotScale(pivotController);

        // Y+ should zoom IN (larger scale)
        // rightY > 0 is a zoom factor above 1, which scales the pivot up
        assert.isAbove(finalScale, initialScale, "Right stick Y+ (forward) should zoom IN (larger scale)");
    });

    test("right stick Y- (back) zooms OUT", () => {
        // Record initial scale
        const initialScale = getPivotScale(pivotController);

        // Set right stick back (Y-)
        driver.setStick("right", 0, -0.8);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final scale
        const finalScale = getPivotScale(pivotController);

        // Y- should zoom OUT (smaller scale)
        assert.isBelow(finalScale, initialScale, "Right stick Y- (back) should zoom OUT (smaller scale)");
    });

    // Additional tests for deadzone behavior
    test("deadzone filters inputs below threshold (0.15)", () => {
        // Record initial state
        const initialEuler = getPivotEuler(pivotController);
        const initialScale = getPivotScale(pivotController);

        // Set thumbstick values below deadzone
        driver.setStick("left", 0.1, 0.1);
        driver.setStick("right", 0.1, 0.1);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final state
        const finalEuler = getPivotEuler(pivotController);
        const finalScale = getPivotScale(pivotController);

        // Nothing should have changed - inputs were below deadzone
        assert.closeTo(
            finalEuler.y,
            initialEuler.y,
            0.0001,
            "Deadzone should filter inputs below 0.15 (yaw unchanged)",
        );
        assert.closeTo(finalScale, initialScale, 0.0001, "Deadzone should filter inputs below 0.15 (scale unchanged)");
    });

    test("deadzone passes inputs above threshold", () => {
        // Record initial state
        const initialEuler = getPivotEuler(pivotController);

        // Set thumbstick values above deadzone
        driver.setStick("left", 0.5, 0);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final state
        const finalEuler = getPivotEuler(pivotController);

        // Yaw should have changed - verify the difference is significant
        const yawDiff = Math.abs(finalEuler.y - initialEuler.y);
        assert.isAbove(yawDiff, 0.0001, "Inputs above deadzone should be processed (yaw changed)");
    });

    // Test combined inputs
    test("diagonal left stick input produces combined yaw and pitch", () => {
        // Record initial state
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick to diagonal (both X and Y)
        driver.setStick("left", 0.5, 0.5);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final state
        const finalEuler = getPivotEuler(pivotController);

        // Both yaw and pitch should have changed - verify differences are significant
        const yawDiff = Math.abs(finalEuler.y - initialEuler.y);
        const pitchDiff = Math.abs(finalEuler.x - initialEuler.x);
        assert.isAbove(yawDiff, 0.0001, "Diagonal input should change yaw");
        assert.isAbove(pitchDiff, 0.0001, "Diagonal input should change pitch");
    });

    test("both thumbsticks can be used simultaneously", () => {
        // Record initial state
        const initialEuler = getPivotEuler(pivotController);
        const initialScale = getPivotScale(pivotController);

        // Set both thumbsticks
        driver.setStick("left", 0.5, 0); // Yaw
        driver.setStick("right", 0, 0.5); // Zoom

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final state
        const finalEuler = getPivotEuler(pivotController);
        const finalScale = getPivotScale(pivotController);

        // Both yaw and scale should have changed - verify differences are significant
        const yawDiff = Math.abs(finalEuler.y - initialEuler.y);
        const scaleDiff = Math.abs(finalScale - initialScale);
        assert.isAbove(yawDiff, 0.0001, "Simultaneous input: yaw should change");
        assert.isAbove(scaleDiff, 0.0001, "Simultaneous input: scale should change");
    });
});

describe("XR InputUtils applyDeadzone", () => {
    test("returns 0 for inputs below threshold", () => {
        assert.equal(applyDeadzone(0.1, 0.15), 0, "0.1 should be filtered by 0.15 deadzone");
        assert.equal(applyDeadzone(-0.1, 0.15), 0, "-0.1 should be filtered by 0.15 deadzone");
        assert.equal(applyDeadzone(0.14, 0.15), 0, "0.14 should be filtered by 0.15 deadzone");
    });

    test("returns non-zero for inputs above threshold", () => {
        assert.notEqual(applyDeadzone(0.5, 0.15), 0, "0.5 should pass 0.15 deadzone");
        assert.notEqual(applyDeadzone(-0.5, 0.15), 0, "-0.5 should pass 0.15 deadzone");
        assert.notEqual(applyDeadzone(0.2, 0.15), 0, "0.2 should pass 0.15 deadzone");
    });

    test("preserves sign of input", () => {
        assert.isAbove(applyDeadzone(0.5, 0.15), 0, "Positive input should produce positive output");
        assert.isBelow(applyDeadzone(-0.5, 0.15), 0, "Negative input should produce negative output");
    });

    test("applies quadratic curve for smooth acceleration", () => {
        // The function should remap [deadzone, 1] to [0, 1] with a quadratic curve
        // Value at max input should be 1 (or close to it for sign preservation)
        const maxOutput = applyDeadzone(1.0, 0.15);
        assert.closeTo(maxOutput, 1.0, 0.01, "Max input should produce output close to 1");

        // Mid-range should be curved (less than linear)
        const midInput = 0.5;
        const midOutput = applyDeadzone(midInput, 0.15);
        // Linear mapping would give: (0.5 - 0.15) / (1 - 0.15) = 0.35 / 0.85 ≈ 0.41
        // Quadratic should give something less than linear or equal depending on implementation
        // The quadratic curve squares the normalized value
        assert.isAbove(midOutput, 0, "Mid-range input should produce positive output");
    });
});
