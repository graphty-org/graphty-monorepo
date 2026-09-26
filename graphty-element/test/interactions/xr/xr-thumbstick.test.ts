/**
 * XR Thumbstick Integration Tests
 *
 * These tests verify that XR thumbstick inputs produce the expected scene transformations
 * using IWER (Immersive Web Emulation Runtime) for WebXR emulation.
 *
 * Tests are designed to catch direction-related regressions:
 * - Left stick X+ should rotate scene RIGHT
 * - Left stick Y+ should pitch scene UP (forward push)
 * - Right stick X+ should pan scene RIGHT
 * - Right stick Y+ should zoom IN (forward push)
 * - Deadzone filtering should work correctly
 */

import { Quaternion, Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { applyDeadzone, thumbstickDeltas, XR_THUMBSTICK_DEADZONE } from "../../../src/cameras/InputUtils";
import type { PivotController } from "../../../src/cameras/PivotController";
import type { Graph } from "../../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup";
import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

/**
 * Helper to get pivot rotation as Euler angles for verification
 */
function getPivotEuler(pivot: PivotController): { x: number; y: number; z: number } {
    const quat = pivot.pivot.rotationQuaternion ?? Quaternion.Identity();
    const euler = quat.toEulerAngles();
    return { x: euler.x, y: euler.y, z: euler.z };
}

/**
 * Helper to get pivot scale for zoom verification
 */
function getPivotScale(pivot: PivotController): number {
    return pivot.pivot.scaling.x;
}

/**
 * Helper to get pivot position for pan verification
 */
function getPivotPosition(pivot: PivotController): Vector3 {
    return pivot.pivot.position.clone();
}

describe("XR Thumbstick Controls", () => {
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

    test("left stick X+ rotates scene RIGHT", () => {
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
        assert.isAbove(finalEuler.y, initialEuler.y, "Left stick X+ should rotate scene RIGHT (positive yaw)");
    });

    test("left stick Y+ pitches scene UP", () => {
        // Record initial rotation
        const initialEuler = getPivotEuler(pivotController);

        // Set left stick forward (Y+)
        // Note: In XR controller space, Y+ is typically "forward" which
        // corresponds to the user pushing the stick away from themselves
        driver.setStick("left", 0, 0.8);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final rotation
        const finalEuler = getPivotEuler(pivotController);

        // Y+ (forward push) is a positive pitch: the graph moves up, as a mouse or touch drag does
        assert.isAbove(finalEuler.x, initialEuler.x, "Left stick Y+ (forward) should pitch scene UP (positive pitch)");
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
        assert.isAbove(finalPos.x, initialPos.x, "Right stick X+ should pan scene RIGHT (positive X)");
    });

    test("right stick Y+ zooms IN", () => {
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

        // Y+ (forward push) should zoom IN (larger scale)
        // zoomFactor = 1.0 + rightY * ZOOM_SPEED > 1.0 when rightY > 0
        assert.isAbove(finalScale, initialScale, "Right stick Y+ (forward) should zoom IN (larger scale)");
    });

    test("deadzone filtering works in XR", () => {
        // Record initial state
        const initialEuler = getPivotEuler(pivotController);
        const initialScale = getPivotScale(pivotController);
        const initialPos = getPivotPosition(pivotController);

        // Set thumbstick values below deadzone (0.15)
        driver.setStick("left", 0.1, 0.1);
        driver.setStick("right", 0.1, 0.1);

        // Process several frames
        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        // Get final state
        const finalEuler = getPivotEuler(pivotController);
        const finalScale = getPivotScale(pivotController);
        const finalPos = getPivotPosition(pivotController);

        // Nothing should have changed - inputs were below deadzone
        assert.closeTo(finalEuler.y, initialEuler.y, 0.0001, "Deadzone should filter yaw inputs below 0.15");
        assert.closeTo(finalEuler.x, initialEuler.x, 0.0001, "Deadzone should filter pitch inputs below 0.15");
        assert.closeTo(finalScale, initialScale, 0.0001, "Deadzone should filter zoom inputs below 0.15");
        assert.closeTo(finalPos.x, initialPos.x, 0.0001, "Deadzone should filter pan inputs below 0.15");
    });

    // Additional direction verification tests
    test("left stick X- rotates scene LEFT", () => {
        const initialEuler = getPivotEuler(pivotController);

        driver.setStick("left", -0.8, 0);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalEuler = getPivotEuler(pivotController);

        assert.isBelow(finalEuler.y, initialEuler.y, "Left stick X- should rotate scene LEFT (negative yaw)");
    });

    test("left stick Y- pitches scene DOWN", () => {
        const initialEuler = getPivotEuler(pivotController);

        // Y- = pulling stick toward yourself
        driver.setStick("left", 0, -0.8);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalEuler = getPivotEuler(pivotController);

        // Y- (pull back) is a negative pitch: the graph moves down
        assert.isBelow(finalEuler.x, initialEuler.x, "Left stick Y- should pitch scene DOWN (negative pitch)");
    });

    test("right stick X- pans scene LEFT", () => {
        const initialPos = getPivotPosition(pivotController);

        driver.setStick("right", -0.8, 0);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalPos = getPivotPosition(pivotController);

        assert.isBelow(finalPos.x, initialPos.x, "Right stick X- should pan scene LEFT (negative X)");
    });

    test("right stick Y- zooms OUT", () => {
        const initialScale = getPivotScale(pivotController);

        driver.setStick("right", 0, -0.8);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalScale = getPivotScale(pivotController);

        assert.isBelow(finalScale, initialScale, "Right stick Y- should zoom OUT (smaller scale)");
    });

    test("both thumbsticks can be used simultaneously", () => {
        const initialEuler = getPivotEuler(pivotController);
        const initialScale = getPivotScale(pivotController);

        // Set both thumbsticks
        driver.setStick("left", 0.5, 0); // Yaw
        driver.setStick("right", 0, 0.5); // Zoom

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalEuler = getPivotEuler(pivotController);
        const finalScale = getPivotScale(pivotController);

        // Both yaw and scale should have changed
        const yawDiff = Math.abs(finalEuler.y - initialEuler.y);
        const scaleDiff = Math.abs(finalScale - initialScale);

        assert.isAbove(yawDiff, 0.0001, "Simultaneous input: yaw should change");
        assert.isAbove(scaleDiff, 0.0001, "Simultaneous input: scale should change");
    });

    test("diagonal left stick input produces combined yaw and pitch", () => {
        const initialEuler = getPivotEuler(pivotController);

        driver.setStick("left", 0.5, 0.5);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalEuler = getPivotEuler(pivotController);

        const yawDiff = Math.abs(finalEuler.y - initialEuler.y);
        const pitchDiff = Math.abs(finalEuler.x - initialEuler.x);

        assert.isAbove(yawDiff, 0.0001, "Diagonal input should change yaw");
        assert.isAbove(pitchDiff, 0.0001, "Diagonal input should change pitch");
    });

    test("diagonal right stick input produces combined pan and zoom", () => {
        const initialPos = getPivotPosition(pivotController);
        const initialScale = getPivotScale(pivotController);

        driver.setStick("right", 0.5, 0.5);

        for (let i = 0; i < 10; i++) {
            driver.frame();
        }

        const finalPos = getPivotPosition(pivotController);
        const finalScale = getPivotScale(pivotController);

        const posDiff = Math.abs(finalPos.x - initialPos.x);
        const scaleDiff = Math.abs(finalScale - initialScale);

        assert.isAbove(posDiff, 0.0001, "Diagonal input should pan");
        assert.isAbove(scaleDiff, 0.0001, "Diagonal input should zoom");
    });
});

/**
 * Test deadzone function directly
 */
describe("XR Thumbstick Deadzone Behavior", () => {
    test("applyDeadzone returns 0 for inputs below threshold", () => {
        const DEADZONE = XR_THUMBSTICK_DEADZONE;
        assert.equal(applyDeadzone(0.1, DEADZONE), 0, "0.1 should be filtered");
        assert.equal(applyDeadzone(-0.1, DEADZONE), 0, "-0.1 should be filtered");
        assert.equal(applyDeadzone(0.14, DEADZONE), 0, "0.14 should be filtered");
        assert.equal(applyDeadzone(0.0, DEADZONE), 0, "0 should return 0");
    });

    test("applyDeadzone returns non-zero for inputs above threshold", () => {
        const DEADZONE = XR_THUMBSTICK_DEADZONE;
        assert.notEqual(applyDeadzone(0.5, DEADZONE), 0, "0.5 should pass");
        assert.notEqual(applyDeadzone(-0.5, DEADZONE), 0, "-0.5 should pass");
        assert.notEqual(applyDeadzone(0.2, DEADZONE), 0, "0.2 should pass");
    });

    test("applyDeadzone preserves sign of input", () => {
        const DEADZONE = XR_THUMBSTICK_DEADZONE;
        assert.isAbove(applyDeadzone(0.5, DEADZONE), 0, "Positive should stay positive");
        assert.isBelow(applyDeadzone(-0.5, DEADZONE), 0, "Negative should stay negative");
    });

    test("applyDeadzone max input produces output close to 1", () => {
        const DEADZONE = XR_THUMBSTICK_DEADZONE;
        const maxOutput = applyDeadzone(1.0, DEADZONE);
        assert.closeTo(maxOutput, 1.0, 0.01, "Max input should produce ~1");
    });
});

describe("XR thumbstick speeds", () => {
    test("full deflection yaws 0.04, pitches 0.03, zooms by 1.02 and pans 0.08 per frame", () => {
        const full = thumbstickDeltas({ x: 1, y: 1 }, { x: 1, y: 1 });

        assert.closeTo(full.yaw, 0.04, 1e-12);
        assert.closeTo(full.pitch, 0.03, 1e-12);
        assert.closeTo(full.zoom, 1.02, 1e-12);
        assert.closeTo(full.pan, 0.08, 1e-12);
    });

    test("sticks at rest leave the pivot alone", () => {
        assert.deepEqual(thumbstickDeltas({ x: 0.1, y: -0.1 }, { x: -0.1, y: 0.1 }), {
            yaw: 0,
            pitch: 0,
            zoom: 1,
            pan: 0,
        });
    });
});
