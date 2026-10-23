import { Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { mirrored, placeBeside } from "../../src/meshes/labelScreenFit";

const BOX = { min: new Vector3(-1, -1, -1), max: new Vector3(1, 1, 1), z: 0 };

describe("placeBeside", () => {
    it("hangs a 4 x 2 plane beside a 2 x 2 box with a gap of 0.5", () => {
        const at = (placement: Parameters<typeof placeBeside>[1]): number[] =>
            placeBeside(BOX, placement, 0.5, 4, 2).asArray();
        assert.deepEqual(at("right"), [3.5, 0, 0]);
        assert.deepEqual(at("left"), [-3.5, 0, 0]);
        assert.deepEqual(at("top"), [0, 2.5, 0]);
        assert.deepEqual(at("bottom"), [0, -2.5, 0]);
        assert.deepEqual(at("top-right"), [3.5, 2.5, 0]);
        assert.deepEqual(at("bottom-left"), [-3.5, -2.5, 0]);
        assert.deepEqual(at("center"), [0, 0, 0]);
    });

    it("keeps the depth it is given", () => {
        assert.strictEqual(placeBeside({ ...BOX, z: 7 }, "top", 0, 1, 1).z, 7);
    });
});

describe("mirrored", () => {
    it("swaps only the axis that overflowed", () => {
        assert.strictEqual(mirrored("right", true, false), "left");
        assert.strictEqual(mirrored("top-right", true, false), "top-left");
        assert.strictEqual(mirrored("top-right", false, true), "bottom-right");
        assert.strictEqual(mirrored("bottom-left", true, true), "top-right");
        assert.strictEqual(mirrored("top", true, false), "top");
        assert.strictEqual(mirrored("center", true, true), "center");
    });
});
