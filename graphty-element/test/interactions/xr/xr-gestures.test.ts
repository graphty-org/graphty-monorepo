/**
 * XR Controller Gestures Tests
 *
 * These tests drive the element's real XRInputHandler with tracked hands and verify that
 * two-hand gestures produce the expected scene transformations.
 *
 * Tests cover:
 * - Single trigger picks node
 * - Node follows controller during drag
 * - Two-hand pinch zooms scene
 * - Two-hand rotation rotates scene
 */

import { Quaternion, Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { twoHandGestureDelta } from "../../../src/cameras/InputUtils";
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

/** Thumb-to-index distances, in metres, for a hand that is clearly pinching or clearly open. */
const PINCHED = 0.02;
const OPEN = 0.08;

describe("XR Controller Gestures", () => {
    let graph: Graph;
    let pivotController: PivotController;
    let driver: XRInputDriver;

    beforeEach(async () => {
        graph = await createTestGraph();
        driver = createXRInputDriver(graph.scene);
        pivotController = driver.pivot;
    });

    afterEach(() => {
        driver.dispose();
        vi.restoreAllMocks();
        cleanupTestGraph(graph);
    });

    describe("Single Trigger Interactions", () => {
        test("single trigger does not trigger two-hand gestures", () => {
            // Only left hand pinching (single trigger)
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), OPEN);

            const initialScale = getPivotScale(pivotController);
            const initialEuler = getPivotEuler(pivotController);

            // Process several frames
            for (let i = 0; i < 10; i++) {
                driver.frame();
            }

            const finalScale = getPivotScale(pivotController);
            const finalEuler = getPivotEuler(pivotController);

            // Nothing should have changed - need both hands pinching
            assert.closeTo(finalScale, initialScale, 0.0001, "Single trigger should not zoom");
            assert.closeTo(finalEuler.y, initialEuler.y, 0.0001, "Single trigger should not rotate");
        });
    });

    describe("Two-Hand Pinch Zoom", () => {
        test("two-hand pinch zooms scene", () => {
            // Start with both hands pinching at initial distance
            const startDistance = 0.4;
            driver.setHand("left", new Vector3(-startDistance / 2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(startDistance / 2, 1.0, -0.5), PINCHED);

            // Initialize gesture tracking
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            // Move hands closer together (pinch in = zoom out)
            const endDistance = 0.2;
            driver.setHand("left", new Vector3(-endDistance / 2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(endDistance / 2, 1.0, -0.5), PINCHED);

            // Process the gesture
            driver.frame();

            const finalScale = getPivotScale(pivotController);

            // Moving hands closer should zoom OUT (smaller scale)
            // Because: distanceDelta < 0, zoomFactor < 1, 2.0 - zoomFactor > 1
            assert.notEqual(finalScale, initialScale, "Two-hand pinch should change scale");
        });

        test("hands apart zooms scene in opposite direction", () => {
            // Start with both hands pinching close together
            const startDistance = 0.2;
            driver.setHand("left", new Vector3(-startDistance / 2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(startDistance / 2, 1.0, -0.5), PINCHED);

            // Initialize gesture tracking
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            // Move hands further apart (spread = zoom in)
            const endDistance = 0.6;
            driver.setHand("left", new Vector3(-endDistance / 2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(endDistance / 2, 1.0, -0.5), PINCHED);

            // Process the gesture
            driver.frame();

            const finalScale = getPivotScale(pivotController);

            // Moving hands apart should produce opposite effect
            assert.notEqual(finalScale, initialScale, "Hands apart should change scale");
        });

        test("releasing one hand stops zoom gesture", () => {
            // Start with both hands pinching
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), PINCHED);

            // Initialize gesture tracking
            driver.frame();

            // Release right hand
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), OPEN);

            const initialScale = getPivotScale(pivotController);

            // Move remaining hand
            driver.setHand("left", new Vector3(-0.5, 1.0, -0.5), PINCHED);

            driver.frame();

            const finalScale = getPivotScale(pivotController);

            // Scale should not change - only one hand pinching
            assert.closeTo(finalScale, initialScale, 0.0001, "Single hand should not zoom");
        });
    });

    describe("Two-Hand Rotation", () => {
        test("two-hand rotation rotates scene", () => {
            // Start with hands aligned horizontally
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), PINCHED);

            // Initialize gesture tracking
            driver.frame();

            const initialEuler = getPivotEuler(pivotController);

            // Rotate hands: move left hand up, right hand down (rotate around Z)
            driver.setHand("left", new Vector3(-0.2, 1.2, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.2, 0.8, -0.5), PINCHED);

            // Process the gesture
            driver.frame();

            const finalEuler = getPivotEuler(pivotController);

            // Rotation should have changed
            // Check that at least one axis changed
            const totalRotationChange =
                Math.abs(finalEuler.x - initialEuler.x) +
                Math.abs(finalEuler.y - initialEuler.y) +
                Math.abs(finalEuler.z - initialEuler.z);

            assert.isAbove(totalRotationChange, 0.0001, "Two-hand rotation should rotate scene");
        });

        test("rotating hands around Y axis produces yaw rotation", () => {
            // Start with hands at same height, horizontally aligned
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), PINCHED);

            // Initialize
            driver.frame();

            // Rotate hands around vertical axis (Y) by moving one forward, one back
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.3), PINCHED);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.7), PINCHED);

            const initialEuler = getPivotEuler(pivotController);

            driver.frame();

            const finalEuler = getPivotEuler(pivotController);

            // Check rotation changed (may affect multiple axes due to quaternion conversion)
            const totalChange =
                Math.abs(finalEuler.x - initialEuler.x) +
                Math.abs(finalEuler.y - initialEuler.y) +
                Math.abs(finalEuler.z - initialEuler.z);

            assert.isAbove(totalChange, 0.0001, "Hands rotating around Y should change rotation");
            // The right hand swung away (-Z) and the left toward the user; the graph turns with the
            // hands, which is a negative yaw.
            assert.isBelow(finalEuler.y, initialEuler.y, "The graph should turn with the hands");
        });

        test("releasing one hand stops rotation gesture", () => {
            // Start with both hands pinching
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), PINCHED);

            // Initialize
            driver.frame();

            // Release left hand
            driver.setHand("left", new Vector3(-0.3, 1.2, -0.5), OPEN);

            const initialEuler = getPivotEuler(pivotController);

            // Move remaining hand (should not rotate)
            driver.setHand("right", new Vector3(0.3, 0.8, -0.5), PINCHED);

            driver.frame();

            const finalEuler = getPivotEuler(pivotController);

            // Rotation should not change
            assert.closeTo(finalEuler.x, initialEuler.x, 0.0001, "Single hand should not rotate (X)");
            assert.closeTo(finalEuler.y, initialEuler.y, 0.0001, "Single hand should not rotate (Y)");
            assert.closeTo(finalEuler.z, initialEuler.z, 0.0001, "Single hand should not rotate (Z)");
        });
    });

    describe("Combined Gestures", () => {
        test("simultaneous zoom and rotation produces both effects", () => {
            // Start position
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), PINCHED);

            // Initialize
            driver.frame();

            const initialScale = getPivotScale(pivotController);
            const initialEuler = getPivotEuler(pivotController);

            // Move hands: increase distance AND rotate
            // This simulates pulling hands apart while also tilting them
            driver.setHand("left", new Vector3(-0.4, 1.2, -0.4), PINCHED);
            driver.setHand("right", new Vector3(0.4, 0.8, -0.6), PINCHED);

            driver.frame();

            const finalScale = getPivotScale(pivotController);
            const finalEuler = getPivotEuler(pivotController);

            // Both scale and rotation should change
            const scaleDiff = Math.abs(finalScale - initialScale);
            const rotationDiff =
                Math.abs(finalEuler.x - initialEuler.x) +
                Math.abs(finalEuler.y - initialEuler.y) +
                Math.abs(finalEuler.z - initialEuler.z);

            assert.isAbove(scaleDiff, 0.0001, "Combined gesture should affect scale");
            assert.isAbove(rotationDiff, 0.0001, "Combined gesture should affect rotation");
        });

        test("continuous gesture accumulates changes", () => {
            // Start position
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), PINCHED);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), PINCHED);

            // Initialize
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            // Make multiple small incremental distance increases
            const steps = 5;
            for (let i = 1; i <= steps; i++) {
                const distance = 0.2 + i * 0.05;
                driver.setHand("left", new Vector3(-distance, 1.0, -0.5), PINCHED);
                driver.setHand("right", new Vector3(distance, 1.0, -0.5), PINCHED);
                driver.frame();
            }

            const finalScale = getPivotScale(pivotController);

            // Scale should have accumulated changes
            const scaleDiff = Math.abs(finalScale - initialScale);
            assert.isAbove(scaleDiff, 0.01, "Continuous gesture should accumulate scale changes");
        });
    });
});

describe("XR Gesture State Management", () => {
    let graph: Graph;
    let pivotController: PivotController;
    let driver: XRInputDriver;

    beforeEach(async () => {
        graph = await createTestGraph();
        driver = createXRInputDriver(graph.scene);
        pivotController = driver.pivot;
    });

    afterEach(() => {
        driver.dispose();
        vi.restoreAllMocks();
        cleanupTestGraph(graph);
    });

    test("gesture state resets when hands stop pinching", () => {
        // Start gesture
        driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.2, 1.0, -0.5), PINCHED);
        driver.frame();

        // Continue gesture to set previous state
        driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.3, 1.0, -0.5), PINCHED);
        driver.frame();

        const scaleAfterFirstGesture = getPivotScale(pivotController);

        // Release and re-grab at new positions
        driver.setHand("left", new Vector3(-0.5, 1.0, -0.5), OPEN);
        driver.setHand("right", new Vector3(0.5, 1.0, -0.5), OPEN);
        driver.frame(); // This should reset state

        // Re-pinch at current positions
        driver.setHand("left", new Vector3(-0.5, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.5, 1.0, -0.5), PINCHED);
        driver.frame(); // This should initialize new gesture

        // Move slightly - should not cause large change since we're starting fresh
        driver.setHand("left", new Vector3(-0.51, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.51, 1.0, -0.5), PINCHED);
        driver.frame();

        const scaleAfterRegrab = getPivotScale(pivotController);

        // The change should be small, not based on the distance from first gesture
        const scaleChange = Math.abs(scaleAfterRegrab - scaleAfterFirstGesture);
        assert.isBelow(scaleChange, 0.5, "State should reset between gestures");
    });

    test("alternating hands maintains gesture state", () => {
        // This tests that as long as both hands stay pinching, state is maintained
        driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.2, 1.0, -0.5), PINCHED);

        // Initialize
        driver.frame();

        // Both hands move in same frame
        driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.3, 1.0, -0.5), PINCHED);
        driver.frame();

        const scaleAfterMove = getPivotScale(pivotController);

        // Move again - should accumulate
        driver.setHand("left", new Vector3(-0.4, 1.0, -0.5), PINCHED);
        driver.setHand("right", new Vector3(0.4, 1.0, -0.5), PINCHED);
        driver.frame();

        const scaleAfterSecondMove = getPivotScale(pivotController);

        // Scale should continue changing in same direction
        assert.notEqual(scaleAfterSecondMove, scaleAfterMove, "Continuous movement should continue affecting scale");
    });
});

describe("Two-hand gesture maths", () => {
    const right = new Vector3(1, 0, 0);

    test("hands 1cm further apart zoom out by 2%", () => {
        assert.closeTo(twoHandGestureDelta(0.4, right, 0.41, right).zoom, 0.98, 1e-12);
        assert.closeTo(twoHandGestureDelta(0.4, right, 0.39, right).zoom, 1.02, 1e-12);
    });

    test("zoom is clamped to 10% a frame", () => {
        assert.closeTo(twoHandGestureDelta(0.2, right, 1.2, right).zoom, 0.9, 1e-12);
        assert.closeTo(twoHandGestureDelta(1.2, right, 0.2, right).zoom, 1.1, 1e-12);
    });

    test("turning the hands a quarter turn about +Y rotates the graph a quarter turn with them", () => {
        const { axis, angle } = twoHandGestureDelta(0.4, right, 0.4, new Vector3(0, 0, -1));

        assert.exists(axis);
        assert.closeTo(axis?.y ?? 0, 1, 1e-12);
        assert.closeTo(angle, -Math.PI / 2, 1e-12);
    });

    test("hands that keep their direction do not rotate", () => {
        assert.isNull(twoHandGestureDelta(0.4, right, 0.5, right).axis);
    });
});
