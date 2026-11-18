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
 * A triangle (one unit across) at rest at the origin, with one clip of two keys on its node.
 * @param path - What the clip animates: `translation` or `scale`.
 * @param keys - The two keys' values, three numbers each.
 * @returns The GLB.
 */
function animatedTriangle(path: "translation" | "scale", keys: readonly number[]): Uint8Array {
    const times = new Float32Array([0, 1, ...keys]);
    const bin = new Uint8Array(36 + times.byteLength);
    bin.set(TRIANGLE_BIN, 0);
    bin.set(new Uint8Array(times.buffer), 36);
    return glb(
        triangleGltf({
            animations: [
                {
                    name: "clip",
                    samplers: [{ input: 1, output: 2 }],
                    channels: [{ sampler: 0, target: { node: 0, path } }],
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

/**
 * Prepares an animated template of a GLB on a fresh scene.
 * @param bytes - The GLB.
 * @returns The template.
 */
async function animatedTemplate(bytes: Uint8Array): Promise<Awaited<ReturnType<typeof prepareTemplate>>> {
    const engine = new NullEngine();
    engines.push(engine);
    const scene = new Scene(engine);
    const { container } = await loadModel(scene, bytes, LOAD_OPTIONS);
    return prepareTemplate(
        scene,
        container,
        "clip",
        { up: "y", turn: 0, center: "bounds", fit: "contain", replace: false, animated: true },
        () => null,
    );
}

describe("animated model fit", () => {
    it("sizes and centers a model by its clip's poses, not its rest pose", async () => {
        // The clip holds the triangle 5 units up and lifts it half a unit more.
        const template = await animatedTemplate(animatedTriangle("translation", [0, 5, 0, 0, 5.5, 0]));
        const bounds = template.animation?.bounds;
        assert.isDefined(bounds);
        // Sized by the clip's first frame, the triangle at its full size, and its lift centered on
        // the node: half a unit above the triangle's middle at the top, half below at the bottom.
        assert.closeTo(template.size.y, 1, 1e-6);
        assert.closeTo(bounds.min.y, -0.75, 1e-6);
        assert.closeTo(bounds.max.y, 0.75, 1e-6);
        template.dispose();
    });

    it("sizes a model whose clip grows it in from nothing by the size it grows to", async () => {
        // The clip scales the triangle from 0 to 1: its first frame is a point.
        const template = await animatedTemplate(animatedTriangle("scale", [0, 0, 0, 1, 1, 1]));
        const bounds = template.animation?.bounds;
        assert.isDefined(bounds);
        assert.closeTo(template.size.y, 1, 1e-6);
        assert.isAtMost(bounds.max.y - bounds.min.y, 1 + 1e-6, "drawn no larger than its node's box");
        template.dispose();
    });
});
