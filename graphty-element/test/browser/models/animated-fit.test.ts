/**
 * @file An animated model is fitted into its node's box by the poses its first clip draws, not by
 * its rest pose: a clip that holds the model away from where it rests (aerobatic_plane.glb's idle,
 * a ball's bounce) is still drawn at its full size, centered on its node.
 */

import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { loadModel } from "babylonjs-models";
import { afterEach, assert, describe, it } from "vitest";

import { LOAD_OPTIONS } from "../../../src/models/chunk";
import { prepareTemplate } from "../../../src/models/prepareTemplate";
import { glb, TRIANGLE_BIN, triangleGltf } from "../../fixtures/models/fixtures";

const engines: NullEngine[] = [];

afterEach(() => {
    for (const engine of engines.splice(0)) {
        engine.scenes.slice().forEach((scene) => {
            scene.dispose();
        });
        engine.dispose();
    }
});

/**
 * A triangle (one unit across) at rest at the origin, whose one clip holds it 5 units up and
 * lifts it half a unit more.
 * @returns The GLB.
 */
function liftedTriangle(): Uint8Array {
    const keys = new Float32Array([0, 1, 0, 5, 0, 0, 5.5, 0]);
    const bin = new Uint8Array(36 + keys.byteLength);
    bin.set(TRIANGLE_BIN, 0);
    bin.set(new Uint8Array(keys.buffer), 36);
    return glb(
        triangleGltf({
            animations: [
                {
                    name: "lift",
                    samplers: [{ input: 1, output: 2 }],
                    channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
                },
            ],
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
                { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] },
                { bufferView: 2, componentType: 5126, count: 2, type: "VEC3" },
            ],
            bufferViews: [
                { buffer: 0, byteLength: 36 },
                { buffer: 0, byteOffset: 36, byteLength: 8 },
                { buffer: 0, byteOffset: 44, byteLength: 24 },
            ],
            buffers: [{ byteLength: bin.length }],
        }),
        bin,
    );
}

describe("animated model fit", () => {
    it("sizes and centers a model by its clip's poses, not its rest pose", async () => {
        const engine = new NullEngine();
        engines.push(engine);
        const scene = new Scene(engine);
        const { container } = await loadModel(scene, liftedTriangle(), LOAD_OPTIONS);
        const template = await prepareTemplate(
            scene,
            container,
            "lift",
            { up: "y", turn: 0, center: "bounds", fit: "contain", replace: false, animated: true },
            () => null,
        );
        const bounds = template.animation?.bounds;
        assert.isDefined(bounds);
        // Sized by the clip's first frame, the triangle at its full size, and its lift centered on
        // the node: half a unit above the triangle's middle at the top, half below at the bottom.
        assert.closeTo(template.size.y, 1, 1e-6);
        assert.closeTo(bounds.min.y, -0.75, 1e-6);
        assert.closeTo(bounds.max.y, 0.75, 1e-6);
        template.dispose();
    });
});
