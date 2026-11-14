// Imports Babylon.js only by deep path, never the @babylonjs/core barrel: the barrel registers every
// controller class on its own and would hide a lazy XR load that forgets them.
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { WebXRMotionControllerManager } from "@babylonjs/core/XR/motionController/webXRMotionControllerManager.js";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { loadWebXRDefaultExperience } from "../../src/xr/XRSessionManager";

describe("lazy WebXR load", () => {
    let engine: NullEngine;
    let scene: Scene;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        WebXRMotionControllerManager.UseOnlineRepository = false;
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    test.each(["oculus-touch", "htc-vive", "generic-hand-select-grasp"])(
        "registers the %s controller class",
        async (profile) => {
            await loadWebXRDefaultExperience();
            const xrInput = {
                handedness: "right",
                profiles: [profile],
                gamepad: { buttons: [], axes: [], id: profile },
            } as unknown as XRInputSource;
            const controller = await WebXRMotionControllerManager.GetMotionControllerWithXRInput(
                xrInput,
                scene,
                profile,
            );
            assert.strictEqual(controller.profileId, profile);
            controller.dispose();
        },
    );
});

