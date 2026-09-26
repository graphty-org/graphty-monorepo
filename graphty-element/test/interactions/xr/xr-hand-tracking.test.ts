/**
 * XR Hand Tracking Tests
 *
 * These tests verify the element's pinch maths, and drive its real XRInputHandler with tracked
 * hands to verify pinch hysteresis and two-hand gestures.
 *
 * Tests cover:
 * - Pinch detection and strength
 * - Pinch threshold hysteresis works correctly
 * - Two-hand gestures work with hands
 */

import { Quaternion, Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { isPinching, pinchStrength } from "../../../src/cameras/InputUtils";
import type { PivotController } from "../../../src/cameras/PivotController";
import type { Graph } from "../../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup";
import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

/**
 * Helper to get pivot scale
 */
function getPivotScale(pivot: PivotController): number {
    return pivot.pivot.scaling.x;
}

/**
 * Helper to get pivot rotation as Euler angles
 */
function getPivotEuler(pivot: PivotController): { x: number; y: number; z: number } {
    const quat = pivot.pivot.rotationQuaternion ?? Quaternion.Identity();
    const euler = quat.toEulerAngles();
    return { x: euler.x, y: euler.y, z: euler.z };
}

describe("XR Hand Tracking", () => {
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

    describe("Pinch Gesture Detection", () => {
        test("pinch gesture triggers when thumb and index are close", () => {
            assert.isTrue(isPinching(0.02, false), "Should detect pinch when fingers are 2cm apart");
            assert.isAtLeast(pinchStrength(0.02), 0.5, "Pinch strength should be high");
        });

        test("pinch gesture not triggered when fingers are apart", () => {
            assert.isFalse(isPinching(0.08, false), "Should not detect pinch when fingers are 8cm apart");
            assert.equal(pinchStrength(0.08), 0, "Pinch strength should be 0 when not pinching");
        });

        test("pinch strength varies with finger distance", () => {
            assert.isAbove(pinchStrength(0.01), pinchStrength(0.02), "Closer = stronger");
            assert.isAbove(pinchStrength(0.02), pinchStrength(0.03), "Medium distance = medium strength");
        });
    });

    describe("Pinch Threshold Hysteresis", () => {
        test("pinch starts under 4cm and releases over 6cm", () => {
            assert.isTrue(isPinching(0.039, false));
            assert.isFalse(isPinching(0.041, false));
            assert.isTrue(isPinching(0.059, true));
            assert.isFalse(isPinching(0.061, true));
        });

        test("pinch threshold hysteresis prevents flicker at boundary", () => {
            // 5cm is between the start (4cm) and release (6cm) distances
            assert.isFalse(isPinching(0.05, false), "An open hand at 5cm is not pinching");
            assert.isTrue(isPinching(0.05, true), "A pinching hand at 5cm stays pinching");
        });

        test("hysteresis state is independent per hand", () => {
            // Left pinches firmly, then relaxes to 5cm: still pinching. Right opens at 5cm: not.
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.02);
            driver.frame();
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.05);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), 0.05);
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            driver.setHand("left", new Vector3(-0.4, 1.0, -0.5), 0.05);
            driver.setHand("right", new Vector3(0.4, 1.0, -0.5), 0.05);
            driver.frame();
            assert.closeTo(
                getPivotScale(pivotController),
                initialScale,
                1e-12,
                "Right hand at 5cm should not be pinching",
            );

            // Right pinches firmly and relaxes to 5cm: now both hands pinch and spreading them zooms.
            driver.setHand("right", new Vector3(0.4, 1.0, -0.5), 0.02);
            driver.frame();
            driver.setHand("left", new Vector3(-0.5, 1.0, -0.5), 0.05);
            driver.setHand("right", new Vector3(0.5, 1.0, -0.5), 0.05);
            driver.frame();
            assert.notEqual(getPivotScale(pivotController), initialScale, "Both hands at 5cm should still be pinching");
        });
    });

    describe("Two-Hand Gestures with Hand Tracking", () => {
        test("two-hand pinch zooms scene", () => {
            // Both hands pinching
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), 0.02);

            // Initialize gesture
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            // Move hands apart (spread)
            driver.setHand("left", new Vector3(-0.4, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.4, 1.0, -0.5), 0.02);

            driver.frame();

            const finalScale = getPivotScale(pivotController);

            assert.notEqual(finalScale, initialScale, "Two-hand spread should zoom");
        });

        test("two-hand rotation rotates scene with hands", () => {
            // Both hands pinching, aligned horizontally
            driver.setHand("left", new Vector3(-0.3, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), 0.02);

            // Initialize
            driver.frame();

            const initialEuler = getPivotEuler(pivotController);

            // Rotate hands (left up, right down)
            driver.setHand("left", new Vector3(-0.2, 1.2, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.2, 0.8, -0.5), 0.02);

            driver.frame();

            const finalEuler = getPivotEuler(pivotController);

            const totalChange =
                Math.abs(finalEuler.x - initialEuler.x) +
                Math.abs(finalEuler.y - initialEuler.y) +
                Math.abs(finalEuler.z - initialEuler.z);

            assert.isAbove(totalChange, 0.0001, "Two-hand rotation should rotate scene");
        });

        test("releasing pinch on one hand stops gesture", () => {
            // Both hands pinching
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), 0.02);

            driver.frame();

            // Release right hand pinch
            driver.setHand("right", new Vector3(0.3, 1.0, -0.5), 0.08);

            const initialScale = getPivotScale(pivotController);

            // Move left hand (should not cause gesture)
            driver.setHand("left", new Vector3(-0.4, 1.0, -0.5), 0.02);

            driver.frame();

            const finalScale = getPivotScale(pivotController);

            assert.closeTo(finalScale, initialScale, 0.0001, "Single hand should not zoom");
        });

        test("gesture continues through hand movement while pinching", () => {
            // Initialize gesture
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), 0.02);
            driver.frame();

            const initialScale = getPivotScale(pivotController);

            // Accumulate multiple movements
            const steps = 5;
            for (let i = 1; i <= steps; i++) {
                const offset = i * 0.05;
                driver.setHand("left", new Vector3(-0.2 - offset, 1.0, -0.5), 0.02);
                driver.setHand("right", new Vector3(0.2 + offset, 1.0, -0.5), 0.02);
                driver.frame();
            }

            const finalScale = getPivotScale(pivotController);

            const scaleDiff = Math.abs(finalScale - initialScale);
            assert.isAbove(scaleDiff, 0.01, "Continuous gesture should accumulate");
        });
    });

    describe("Hand Tracking Edge Cases", () => {
        test("rapid pinch toggle does not cause erratic behavior", () => {
            const scales: number[] = [];

            // Rapidly toggle pinch state
            for (let i = 0; i < 10; i++) {
                const distance = i % 2 === 0 ? 0.02 : 0.08;

                driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), distance);
                driver.setHand("right", new Vector3(0.2, 1.0, -0.5), distance);

                driver.frame();
                scales.push(getPivotScale(pivotController));
            }

            // Scale should not vary wildly
            const maxScale = Math.max(...scales);
            const minScale = Math.min(...scales);
            const range = maxScale - minScale;

            // Range should be reasonable (not erratic)
            assert.isBelow(range, 1.0, "Rapid toggle should not cause extreme scale changes");
        });

        test("transitioning between hands maintains stability", () => {
            // Start with both hands pinching
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.02);
            driver.setHand("right", new Vector3(0.2, 1.0, -0.5), 0.02);
            driver.frame();

            const scaleWithBoth = getPivotScale(pivotController);

            // Release left hand
            driver.setHand("left", new Vector3(-0.2, 1.0, -0.5), 0.08);
            driver.frame();

            // Re-engage left hand at different position
            driver.setHand("left", new Vector3(-0.4, 1.0, -0.5), 0.02);
            driver.frame();

            const scaleAfterReengage = getPivotScale(pivotController);

            // Scale should be similar - state reset should prevent jump
            const diff = Math.abs(scaleAfterReengage - scaleWithBoth);
            assert.isBelow(diff, 0.5, "Re-engaging should not cause large scale jump");
        });

        test("pinch at extreme distances handles gracefully", () => {
            assert.isTrue(isPinching(0.001, false), "Very close should be pinching");
            assert.isAbove(pinchStrength(0.001), 0.9, "Very close should have high strength");
            assert.isTrue(isPinching(0, false), "Zero distance should be pinching");
            assert.closeTo(pinchStrength(0), 1.0, 0.01, "Zero distance should have max strength");
            assert.isFalse(isPinching(1.0, false), "Very far should not be pinching");
            assert.equal(pinchStrength(1.0), 0, "Very far should have zero strength");
        });
    });
});

describe("Pinch Strength Calculation", () => {
    test("pinchStrength returns 1 at zero distance", () => {
        const strength = pinchStrength(0);
        assert.closeTo(strength, 1.0, 0.01, "Zero distance = full strength");
    });

    test("pinchStrength returns 0 at threshold", () => {
        const strength = pinchStrength(0.04);
        assert.closeTo(strength, 0.0, 0.01, "At threshold = zero strength");
    });

    test("pinchStrength returns 0.5 at half threshold", () => {
        const strength = pinchStrength(0.02);
        assert.closeTo(strength, 0.5, 0.01, "Half threshold = half strength");
    });

    test("pinchStrength clamps to 0 beyond threshold", () => {
        const strength = pinchStrength(0.08);
        assert.equal(strength, 0, "Beyond threshold = zero strength");
    });
});
