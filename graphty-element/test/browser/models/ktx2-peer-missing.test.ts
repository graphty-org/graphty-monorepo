/**
 * A KTX2 texture when the optional peer `@babylonjs/ktx2decoder` is not installed: the model is not
 * drawn, and the failure says which package is missing (`E_MODEL_DECODER_UNAVAILABLE`,
 * `reason: "missing"`), with nothing fetched from a CDN in its place.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, it, vi } from "vitest";

import { loadModel, ModelLoadFailure } from "../../../src/models/loadModel";
import binUrl from "../../fixtures/models/variants/gltf-ktx2/cube.bin?url";
import gltfUrl from "../../fixtures/models/variants/gltf-ktx2/cube.gltf?url";
import ktx2Url from "../../fixtures/models/variants/gltf-ktx2/cube.ktx2?url";

// Stands in for a page without the package: the module the element imports has no decoder.
vi.mock("@babylonjs/ktx2decoder", () => ({}));

describe("a KTX2 texture without its decoder package", () => {
    it("fails with the package's name, not a fetch", async () => {
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        const engine = new Engine(canvas);
        const bytes = async (url: string): Promise<Uint8Array> =>
            new Uint8Array(await (await fetch(url)).arrayBuffer());
        const files = new Map([
            ["cube.gltf", await bytes(gltfUrl)],
            ["cube.bin", await bytes(binUrl)],
            ["cube.ktx2", await bytes(ktx2Url)],
        ]);
        try {
            const error = await loadModel(new Scene(engine), files, "cube.gltf", "gltf").catch((e: unknown) => e);
            assert.instanceOf(error, ModelLoadFailure);
            assert.deepStrictEqual(error.fact, {
                code: "E_MODEL_DECODER_UNAVAILABLE",
                params: { extension: "KHR_texture_basisu", package: "@babylonjs/ktx2decoder", reason: "missing" },
            });
        } finally {
            engine.dispose();
            canvas.remove();
        }
    });
});
