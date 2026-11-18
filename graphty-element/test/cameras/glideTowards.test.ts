import { Vector3 } from "@babylonjs/core";
import { assert, describe, test } from "vitest";

import { glideTowards } from "../../src/cameras/CameraManager";

describe("glideTowards", () => {
    test("a pass standing for three frames covers what three one-frame passes cover", () => {
        const target = new Vector3(10, -4, 2);
        const stepped = new Vector3(0, 0, 0);
        for (let i = 0; i < 3; i++) {
            glideTowards(stepped, target);
        }
        const once = new Vector3(0, 0, 0);
        glideTowards(once, target, 3);
        assert.closeTo(Vector3.Distance(stepped, once), 0, 1e-9);
    });

    test("a hand-pumped pass (0 frames) glides one frame's share", () => {
        const target = new Vector3(10, 0, 0);
        const pumped = new Vector3(0, 0, 0);
        glideTowards(pumped, target, 0);
        assert.closeTo(pumped.x, 1.6, 1e-9);
    });

    test("two half-frame passes (a 120 Hz display) cover what one 60 Hz frame covers", () => {
        const target = new Vector3(10, 0, 0);
        const fast = new Vector3(0, 0, 0);
        glideTowards(fast, target, 0.5);
        glideTowards(fast, target, 0.5);
        const once = new Vector3(0, 0, 0);
        glideTowards(once, target, 1);
        assert.closeTo(fast.x, once.x, 1e-9);
    });
});
