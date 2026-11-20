/**
 * @file A world point's place on screen is known before the scene's first frame: the scene's view
 * matrix is unset until then, so the projection reads the camera's.
 */

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, it } from "vitest";

import { screenProjector } from "../../src/render/PickService";

describe("screenProjector", () => {
    it("projects before the scene's first frame", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        assert.strictEqual(scene.getFrameId(), 0);
        assert.isUndefined(scene.getViewMatrix(), "the scene's own view matrix is unset");

        const at = screenProjector(scene, camera)({ x: 0, y: 0, z: 0 });

        const css = engine.getHardwareScalingLevel();
        assert.closeTo(at.x, (engine.getRenderWidth() * css) / 2, 1e-6);
        assert.closeTo(at.y, (engine.getRenderHeight() * css) / 2, 1e-6);
        scene.dispose();
        engine.dispose();
    });
});
