import { NullEngine, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { type FramingSpot, OrbitCameraController } from "../../../src/cameras/OrbitCameraController";

/**
 * A 3D zoom-to-fit centers what is drawn on the screen, not the center of its box (issue #9506).
 * The graph is lopsided on purpose: its near nodes sit to the right and above, its far ones to the
 * left and below, so the perspective draws the box's center off the middle of the canvas.
 */

/** The largest gap allowed between opposite margins, as a share of the canvas side. */
const TOLERANCE = 0.005;

const config = {
    trackballRotationSpeed: 0.01,
    keyboardRotationSpeed: 0.05,
    keyboardZoomSpeed: 0.015,
    keyboardYawSpeed: 0.05,
    twistYawSensitivity: 0.01,
    minZoomDistance: 1,
    maxZoomDistance: 10000,
    inertiaDamping: 0.9,
};

const spots: FramingSpot[] = [
    { pos: new Vector3(60, 40, -80), half: 4 },
    { pos: new Vector3(80, 60, -80), half: 4 },
    { pos: new Vector3(70, 50, -60), half: 4 },
    { pos: new Vector3(-80, -60, 80), half: 4 },
    { pos: new Vector3(-20, -10, 40), half: 4 },
];

/**
 * The box around the spots.
 * @returns Its corners.
 */
function boxOf(): { min: Vector3; max: Vector3 } {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const { pos, half } of spots) {
        min.minimizeInPlace(pos.subtractFromFloats(half, half, half));
        max.maximizeInPlace(pos.add(new Vector3(half, half, half)));
    }

    return { min, max };
}

describe("3D zoom-to-fit centers the drawing on screen", () => {
    let scene: Scene;
    let controller: OrbitCameraController;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        controller = new OrbitCameraController(canvas, scene, config);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    /**
     * Where every corner of every spot is drawn, as the extremes in normalized device coordinates.
     * @returns The left, right, bottom and top extremes, -1 to 1.
     */
    function drawnExtent(): { left: number; right: number; bottom: number; top: number } {
        const transform = controller.camera.getViewMatrix(true).multiply(controller.camera.getProjectionMatrix(true));
        const extent = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
        for (const { pos, half } of spots) {
            for (let i = 0; i < 8; i++) {
                const corner = pos.add(
                    new Vector3(
                        (i & 1) === 0 ? -half : half,
                        (i & 2) === 0 ? -half : half,
                        (i & 4) === 0 ? -half : half,
                    ),
                );
                const ndc = Vector3.TransformCoordinates(corner, transform);
                extent.left = Math.min(extent.left, ndc.x);
                extent.right = Math.max(extent.right, ndc.x);
                extent.bottom = Math.min(extent.bottom, ndc.y);
                extent.top = Math.max(extent.top, ndc.y);
            }
        }

        return extent;
    }

    /**
     * Fit the box and assert the margins balance.
     */
    function assertCentered(): void {
        const { min, max } = boxOf();
        controller.zoomToBoundingBox(min, max, spots);
        const { left, right, bottom, top } = drawnExtent();

        // Margins as shares of the canvas side: NDC spans 2.
        const leftMargin = (left + 1) / 2;
        const rightMargin = (1 - right) / 2;
        const bottomMargin = (bottom + 1) / 2;
        const topMargin = (1 - top) / 2;
        assert.isAtLeast(Math.min(leftMargin, rightMargin, bottomMargin, topMargin), 0, "everything is in view");
        assert.isBelow(Math.abs(leftMargin - rightMargin), TOLERANCE, `left ${leftMargin} right ${rightMargin}`);
        assert.isBelow(Math.abs(bottomMargin - topMargin), TOLERANCE, `bottom ${bottomMargin} top ${topMargin}`);
    }

    test("the drawing's left and right, and top and bottom, margins match", () => {
        assertCentered();

        // The graph is lopsided: centered, the pivot is well off the box's center.
        const { min, max } = boxOf();
        const center = min.add(max).scale(0.5);
        assert.isAbove(Vector3.Distance(controller.pivot.position, center), 5);
        assert.approximately(controller.pivot.position.z, center.z, 1e-6, "the pivot keeps the center's depth");
    });

    test("the margins match from a turned view too", () => {
        controller.pivot.rotationQuaternion = Quaternion.RotationYawPitchRoll(0.7, 0.3, 0);
        assertCentered();
    });

    test("a turn after the fit turns about the pivot: the camera keeps its distance from it", () => {
        assertCentered();
        const pivot = controller.pivot.position.clone();
        const distance = controller.cameraDistance;
        controller.rotate(40, 25);
        assert.isBelow(Vector3.Distance(controller.pivot.position, pivot), 1e-9);
        assert.strictEqual(controller.cameraDistance, distance);
    });
});
