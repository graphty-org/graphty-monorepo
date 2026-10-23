import { Vector3 } from "@babylonjs/core";
import { assert } from "chai";
import { describe, test } from "vitest";

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

    test("a pass shorter than a frame still glides one frame's share", () => {
        const target = new Vector3(10, 0, 0);
        const slow = new Vector3(0, 0, 0);
        glideTowards(slow, target, 0);
        assert.closeTo(slow.x, 2, 1e-9);
    });
});
