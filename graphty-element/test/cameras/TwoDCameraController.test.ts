import { MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

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

        test("should stand back far enough to see a text centered over the biggest node it frames", () => {
            // a flat node 40 units across: a text centered over it stands half its diagonal (28 units) in front
            // (RichTextLabel's placeInFront), well past the 10 units a flat box alone would leave
            const min = new Vector3(-20, -20, 0);
            const max = new Vector3(20, 20, 0);

            controller.zoomToBoundingBox(min, max);

            const inFront = -Math.hypot(40, 40) / 2;
            assert.isAbove(
                inFront - controller.camera.position.z,
                controller.camera.minZ,
                "the text is past the near plane",
            );
        });
    });

    // The damping arithmetic only; real keys and the render loop are in test/browser/2d-camera-controls.test.ts
    describe("applyInertia", () => {
        test("moves by the velocity, then damps the pan velocity by panDamping", () => {
            const { x } = controller.camera.position;
            controller.velocity.x = 1;

            controller.applyInertia();

            assert.notStrictEqual(controller.camera.position.x, x, "the camera moved");
            assert.closeTo(controller.velocity.x, 0.85, 1e-9, "one frame of panDamping");
        });

        test("damps per unit of time: one 50 ms pass coasts as three 16.7 ms passes do", () => {
            controller.velocity.x = 1;
            controller.applyInertia(3);
            const slow = { x: controller.camera.position.x, v: controller.velocity.x };

            controller.camera.position.x = 0;
            controller.velocity.x = 1;
            for (let frame = 0; frame < 3; frame++) {
                controller.applyInertia(1);
            }

            assert.closeTo(slow.v, controller.velocity.x, 1e-9, "the same speed left");
            assert.closeTo(slow.x, 3, 1e-9, "the slow pass moved three frames at the speed it had");
            assert.isAbove(controller.camera.position.x, 0, "the fast passes moved too");
        });

        test("comes to rest once a frame moves the view under a quarter of a render pixel", () => {
            // NullEngine renders 512 pixels wide, so a pixel is halfWidth / 256 world units.
            const pixel = controller.halfWidth / 256;
            controller.velocity.x = (0.28 * pixel) / 0.85;
            controller.applyInertia();
            assert.isAbove(controller.velocity.x, 0, "0.28 px a frame still moves");
            controller.applyInertia();
            assert.strictEqual(controller.velocity.x, 0, "0.238 px is under 0.25 px: at rest");
        });

        test("damps the turn velocity by rotateDamping each frame", () => {
            controller.velocity.rotate = 0.1;

            for (let frame = 0; frame < 5; frame++) {
                controller.applyInertia();
            }

            assert.closeTo(controller.velocity.rotate, 0.1 * 0.85 ** 5, 1e-9, "five frames of rotateDamping");
        });
    });
});
