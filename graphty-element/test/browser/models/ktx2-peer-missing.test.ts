/**
 * A KTX2 texture when the optional peer `@babylonjs/ktx2decoder` is not installed: the model is not
 * drawn, and the failure says which package is missing (`E_MODEL_DECODER_UNAVAILABLE`,
 * `reason: "missing"`), with nothing fetched from a CDN in its place. When the file only uses the
 * extension and gives a PNG fallback, the fallback is drawn instead.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, it, vi } from "vitest";

import { loadModel, ModelLoadFailure } from "../../../src/models/loadModel";
import binUrl from "../../fixtures/models/variants/gltf-ktx2/cube.bin?url";
import gltfUrl from "../../fixtures/models/variants/gltf-ktx2/cube.gltf?url";
import ktx2Url from "../../fixtures/models/variants/gltf-ktx2/cube.ktx2?url";
import pngUrl from "../../fixtures/models/variants/gltf-textured/cube.png?url";

// Stands in for a page without the package: the module the element imports has no decoder.
vi.mock("@babylonjs/ktx2decoder", () => ({}));

const bytes = async (url: string): Promise<Uint8Array> => new Uint8Array(await (await fetch(url)).arrayBuffer());

describe("a KTX2 texture without its decoder package", () => {
    it("draws the PNG fallback when the extension is only used", async () => {
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        const engine = new Engine(canvas);
        const json = JSON.parse(new TextDecoder().decode(await bytes(gltfUrl))) as Record<string, unknown>;
        delete json.extensionsRequired;
        json.images = [...(json.images as unknown[]), { uri: "cube.png" }];
        const basisu = "KHR_texture_basisu";
        json.textures = [{ source: 1, extensions: { [basisu]: { source: 0 } } }];
        const files = new Map([
            ["cube.gltf", new TextEncoder().encode(JSON.stringify(json))],
            ["cube.bin", await bytes(binUrl)],
            ["cube.ktx2", await bytes(ktx2Url)],
            ["cube.png", await bytes(pngUrl)],
        ]);
        try {
            const container = await loadModel(new Scene(engine), files, "cube.gltf", "gltf");
            // The glTF loader names each texture's URL after the image it read.
            const urls = container.textures.map((t) => (t as { url?: string | null }).url ?? "");
            assert.isTrue(
                urls.some((u) => u.endsWith("cube.png")),
                `textures: ${urls.join(", ")}`,
            );
        } finally {
            engine.dispose();
            canvas.remove();
        }
    });

    it("fails with the package's name, not a fetch", async () => {
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        const engine = new Engine(canvas);
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
