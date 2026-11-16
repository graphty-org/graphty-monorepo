/**
 * @file The scale `node.sizeSpace` draws a node at, for each space and camera, and the XR check.
 */

import type { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, it } from "vitest";

import { viewSizeScale } from "../../src/render/nodeSizeSpace";
import { inXR } from "../../src/xr/inXR";

const FOV = 0.8;

describe("viewSizeScale", () => {
    it("draws scene at 1 in either camera", () => {
        assert.strictEqual(viewSizeScale("scene", { fov: FOV }, 40, 20, 50), 1);
        assert.strictEqual(viewSizeScale("scene", { orthoHeight: 100 }, 40, 20, 50), 1);
    });

    it("draws pivot at the node's depth over the pivot's in perspective, 1 otherwise", () => {
        assert.strictEqual(viewSizeScale("pivot", { fov: FOV }, 40, 20, 50), 2);
        assert.strictEqual(viewSizeScale("pivot", { fov: FOV }, 40, null, 50), 1, "no orbit pivot");
        assert.strictEqual(viewSizeScale("pivot", { orthoHeight: 100 }, 40, 20, 50), 1, "orthographic");
    });

    it("draws screen at the view's height over the reference", () => {
        assert.strictEqual(viewSizeScale("screen", { orthoHeight: 100 }, 40, null, 50), 2);
        for (const depth of [1, 10, 1000]) {
            const height = 2 * depth * Math.tan(FOV / 2);
            assert.closeTo(viewSizeScale("screen", { fov: FOV }, depth, null, 50), height / 50, 1e-12);
        }
    });

    it("measures a node at or behind the camera at a millionth of a unit", () => {
        const tiny = (2 * 1e-6 * Math.tan(FOV / 2)) / 50;
        assert.closeTo(viewSizeScale("screen", { fov: FOV }, 0, null, 50), tiny, 1e-15);
        assert.closeTo(viewSizeScale("screen", { fov: FOV }, -5, null, 50), tiny, 1e-15);
        assert.isAbove(viewSizeScale("pivot", { fov: FOV }, -5, 20, 50), 0);
    });
});

describe("inXR", () => {
    it("reads the XR helper's state", () => {
        const scene = (state: number | undefined): Scene =>
            ({
                metadata: state === undefined ? null : { xrHelper: { baseExperience: { state } } },
            }) as unknown as Scene;
        assert.isTrue(inXR(scene(2)));
        assert.isFalse(inXR(scene(0)));
        assert.isFalse(inXR(scene(undefined)));
    });
});
