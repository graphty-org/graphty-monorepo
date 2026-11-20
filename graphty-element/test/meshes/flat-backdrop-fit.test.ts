/**
 * @file A flat skybox covers the canvas: the picture's longer side, by aspect, is cropped evenly at
 * both ends, and it is never stretched.
 */

import { assert, describe, it } from "vitest";

import { coverFit } from "../../src/meshes/FlatBackdrop";

describe("coverFit", () => {
    it("crops a picture wider than the canvas at its left and right", () => {
        assert.deepStrictEqual(coverFit(2, 1), [0.5, 1, 0.25, 0]);
    });

    it("crops a picture taller than the canvas at its top and bottom", () => {
        assert.deepStrictEqual(coverFit(1, 2), [1, 0.5, 0, 0.25]);
    });

    it("leaves a picture of the canvas's shape, or one not yet measured, whole", () => {
        assert.deepStrictEqual(coverFit(1.5, 1.5), [1, 1, 0, 0]);
        assert.deepStrictEqual(coverFit(Number.NaN, 1.5), [1, 1, 0, 0]);
    });
});
