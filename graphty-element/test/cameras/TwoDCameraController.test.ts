import { MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test } from "vitest";

import { TwoDCameraController, type TwoDCameraControlsConfigType } from "../../src/cameras/TwoDCameraController";

/**
 * Minimal canvas stand-in. The controller stores the canvas and reads nothing from it,
 * and the default test project has no DOM.
 * @returns An object standing in for the render canvas
 */
function createMockCanvas(): HTMLCanvasElement {
    return {} as unknown as HTMLCanvasElement;
}

/**
 * Default configuration for tests, matching what RenderManager builds.
 * @returns A full 2D camera control configuration
 */
function getDefaultConfig(): TwoDCameraControlsConfigType {
    return {
        panAcceleration: 0.02,
        panDamping: 0.85,
        zoomFactorPerFrame: 0.02,
        zoomDamping: 0.85,
        zoomMin: 0.1,
        zoomMax: 500,
        rotateSpeedPerFrame: 0.02,
        rotateDamping: 0.85,
        rotateMin: null,
        rotateMax: null,
        mousePanScale: 1.0,
        mouseWheelZoomSpeed: 1.1,
        touchPanScale: 1.0,
        touchPinchMin: 0.1,
        touchPinchMax: 100,
        initialOrthoSize: 5,
        rotationEnabled: true,
        inertiaEnabled: true,
    };
}

describe("TwoDCameraController", () => {
    let engine: NullEngine;
    let scene: Scene;
    let controller: TwoDCameraController;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        const canvas = createMockCanvas();
        controller = new TwoDCameraController(scene, engine, canvas, getDefaultConfig());
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    describe("zoomToBoundingBox", () => {
        test("should frame a box tens of thousands of units deep", () => {
            // A ForceAtlas2 simulation settles far beyond Babylon's default far plane of
            // 10000. The orthographic camera must be moved behind the box and its far plane
            // pushed past it, or the graph is clipped away and the canvas renders empty.
            const min = new Vector3(-15000, -15000, -30000);
            const max = new Vector3(15000, 15000, 30000);

            controller.zoomToBoundingBox(min, max);

            assert.isAbove(controller.camera.maxZ, 10000, "The far plane must follow the measured box");
            assert.isBelow(controller.camera.position.z, min.z, "The camera must sit behind the box");

            const box = MeshBuilder.CreateBox(
                "bounds",
                { width: max.x - min.x, height: max.y - min.y, depth: max.z - min.z },
                scene,
            );
            box.position.copyFrom(min.add(max).scale(0.5));
            box.computeWorldMatrix(true);

            controller.camera.getViewMatrix(true);
            controller.camera.getProjectionMatrix(true);

            assert.isTrue(
                controller.camera.isCompletelyInFrustum(box),
                "The whole bounding box must be inside the frustum after the fit",
            );
        });

        test("should centre a small box and leave the far plane at the default", () => {
            const min = new Vector3(-10, -5, -1);
            const max = new Vector3(10, 5, 1);

            controller.zoomToBoundingBox(min, max);

            assert.approximately(controller.camera.position.x, 0, 0.0001);
            assert.approximately(controller.camera.position.y, 0, 0.0001);
            assert.equal(controller.camera.maxZ, 10000, "A small graph keeps the default far plane");
        });
    });
});
