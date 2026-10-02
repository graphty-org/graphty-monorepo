/**
 * Depth fade measures the distance from where the camera really is.
 *
 * The 3D camera is parented to a pivot (src/cameras/OrbitCameraController.ts), so its own
 * `position` is an offset from that pivot -- (0, 0, -distance) whatever the pivot's place or
 * rotation. Fading on that offset faded every label as if the camera sat at that spot near the
 * origin: orbiting the graph changed nothing, and a graph centred away from the origin faded the
 * wrong labels.
 */

import { NullEngine, Scene, StandardMaterial, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

describe("RichTextLabel depth fade", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * Put a camera 10 units from a pivot at (100, 0, 0), and a fading label at `at`.
     * @param at - Where the label sits in the world.
     * @param turn - How far the pivot is turned about the y axis, in radians.
     * @returns The label's alpha after one frame.
     */
    const alphaAt = (at: Vector3, turn = 0): number => {
        const pivot = new TransformNode("pivot", scene);
        pivot.position.set(100, 0, 0);
        pivot.rotation.y = turn;
        const camera = new UniversalCamera("camera", new Vector3(0, 0, -10), scene);
        camera.parent = pivot;
        scene.activeCamera = camera;

        const label = RichTextLabel.createLabel(scene, {
            text: "far",
            position: { x: at.x, y: at.y, z: at.z },
            depthFadeEnabled: true,
            depthFadeNear: 20,
            depthFadeFar: 40,
        });
        scene.render();

        return (label.labelMesh?.material as StandardMaterial).alpha;
    };

    test("a label beside the camera is solid, though it is far from the camera's local offset", () => {
        // The camera is really at (100, 0, -10); this label is 5 units from it and 100 from (0, 0, -10).
        assert.strictEqual(alphaAt(new Vector3(100, 0, -5)), 1);
    });

    test("a label past the far distance from the camera is gone, though it is near the local offset", () => {
        // 100 units from the camera, 0 from (0, 0, -10).
        assert.strictEqual(alphaAt(new Vector3(0, 0, -10)), 0);
    });

    test("turning the pivot moves the camera, and the fade follows it", () => {
        // Turned half a circle, the camera is at (100, 0, 10), 20 units from a label at
        // (100, 0, 30): solid. Unturned, it is at (100, 0, -10), 40 units away: gone.
        assert.strictEqual(alphaAt(new Vector3(100, 0, 30), Math.PI), 1);
        assert.strictEqual(alphaAt(new Vector3(100, 0, 30), 0), 0);
    });
});
