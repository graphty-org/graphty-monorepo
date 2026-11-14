/**
 * A compressed model in a build without the Draco and KTX2 decoders (`./bundle`, which carries no
 * WebAssembly): the model is not drawn, and the failure names the extension whose decoder the build
 * leaves out (`E_MODEL_DECODER_UNAVAILABLE`, `reason: "missing"`), with nothing fetched from a CDN in
 * its place. When a glTF only uses KTX2 and gives a PNG fallback, the fallback is drawn instead.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { assert, describe, it, vi } from "vitest";

import { loadModel, ModelLoadFailure } from "../../../src/models/loadModel";
import dracoUrl from "../../fixtures/models/variants/glb-draco/cube.glb?url";
import binUrl from "../../fixtures/models/variants/gltf-ktx2/cube.bin?url";
import gltfUrl from "../../fixtures/models/variants/gltf-ktx2/cube.gltf?url";
import ktx2Url from "../../fixtures/models/variants/gltf-ktx2/cube.ktx2?url";
import pngUrl from "../../fixtures/models/variants/gltf-textured/cube.png?url";

// Stands in for ./bundle, whose build replaces this module the same way (vite.bundle.config.ts).
vi.mock("../../../src/models/decoders/inBuild", () => ({ DECODERS_IN_BUILD: false }));

const bytes = async (url: string): Promise<Uint8Array> => new Uint8Array(await (await fetch(url)).arrayBuffer());

describe("a compressed model in a build without its decoder", () => {
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

    it("fails for a KTX2 texture the glTF requires, naming the extension, not a fetch", async () => {
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
                params: { extension: "KHR_texture_basisu", reason: "missing" },
            });
        } finally {
            engine.dispose();
            canvas.remove();
        }
    });

    it("fails for Draco geometry, naming the extension, not a fetch", async () => {
        const canvas = document.createElement("canvas");
        document.body.append(canvas);
        const engine = new Engine(canvas);
        try {
            const files = new Map([["cube.glb", await bytes(dracoUrl)]]);
            const error = await loadModel(new Scene(engine), files, "cube.glb", "glb").catch((e: unknown) => e);
            assert.instanceOf(error, ModelLoadFailure);
            assert.deepStrictEqual(error.fact, {
                code: "E_MODEL_DECODER_UNAVAILABLE",
                params: { extension: "KHR_draco_mesh_compression", reason: "missing" },
            });
        } finally {
            engine.dispose();
            canvas.remove();
        }
    });
});
