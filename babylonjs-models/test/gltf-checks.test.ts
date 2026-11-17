/**
 * The glTF checks refuse a file before Babylon reads it: broken JSON or GLB framing, indices out of
 * range, node cycles, buffers shorter than they claim, extensions nothing here reads, and models
 * over the limits.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { withoutGltfPictures } from "../src/files/gltfChecks.js";
import { checkModelFiles, DEFAULT_MODEL_LIMITS, type ModelLimits } from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

/** A glTF's JSON, edited by a test. */
type Json = Record<string, unknown>;

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A variant's file.
 * @param id - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
function fixture(id: string, name: string): Uint8Array {
    return new Uint8Array(readFileSync(join(VARIANTS, id, name)));
}

/**
 * The textured cube's set, its JSON changed.
 * @param change - Edits the JSON.
 * @returns The set.
 */
function cubeWith(change: (json: Json) => void): Map<string, Uint8Array> {
    const json = JSON.parse(new TextDecoder().decode(fixture("gltf-textured", "cube.gltf"))) as Json;
    change(json);
    return new Map([
        ["cube.gltf", new TextEncoder().encode(JSON.stringify(json))],
        ["cube.bin", fixture("gltf-textured", "cube.bin")],
        ["cube.png", fixture("gltf-textured", "cube.png")],
    ]);
}

/**
 * What checking a set threw.
 * @param files - The set.
 * @param limits - The limits.
 * @returns The first fact.
 */
async function refusalOf(files: Map<string, Uint8Array>, limits: ModelLimits = DEFAULT_MODEL_LIMITS) {
    const error = await checkModelFiles(files, {}, limits).then(
        () => assert.fail("the set was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error.fact;
}

describe("the glTF checks", () => {
    it("accept the cube as it is", async () => {
        const checked = await checkModelFiles(
            cubeWith(() => undefined),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.strictEqual(checked.summary.triangles, 12);
    });

    it("list an unnamed clip by the name Babylon's loader gives it, so naming it plays it", async () => {
        const checked = await checkModelFiles(
            cubeWith((json) => {
                const clip = (name?: string): Json => ({
                    ...(name === undefined ? {} : { name }),
                    samplers: [{ input: 0, output: 0 }],
                    channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
                });
                json.animations = [clip(), clip("walk"), clip("")];
            }),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.deepEqual(
            checked.summary.animations.map((clip) => clip.name),
            ["animation0", "walk", "animation2"],
        );
    });

    it("list every picture the materials draw, by image name, uri or index, with their materials", async () => {
        const checked = await checkModelFiles(
            cubeWith((json) => {
                const images = json.images as Json[];
                images.push(
                    { name: "wood", uri: "cube.png" },
                    {
                        uri: `data:image/png;base64,${Buffer.from(fixture("gltf-textured", "cube.png")).toString("base64")}`,
                    },
                );
                // eslint-disable-next-line camelcase -- a glTF extension's name, as the format spells it
                (json.textures as Json[]).push({ source: 1 }, { extensions: { EXT_texture_webp: { source: 2 } } });
                (json.materials as Json[]).push({ normalTexture: { index: 1 }, emissiveTexture: { index: 2 } });
            }),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.deepEqual(checked.summary.pictures, [
            { name: "cube.png", materials: ["cube"] },
            { name: "wood", materials: [""] },
            { name: "image2", materials: [""] },
        ]);

        const obj = await checkModelFiles(
            new Map(["cube.obj", "cube.mtl", "cube.png"].map((name) => [name, fixture("obj-mtl-png", name)])),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.deepEqual(obj.summary.pictures, [{ name: "cube.png", materials: ["cube"] }]);
    });

    it("refuse JSON that does not parse and a GLB cut short", async () => {
        const broken = new Map([["cube.gltf", new TextEncoder().encode("{ not json")]]);
        assert.strictEqual((await refusalOf(broken)).code, "E_MODEL_STRUCTURE");
        const glb = fixture("glb", "cube.glb");
        assert.strictEqual((await refusalOf(new Map([["cube.glb", glb.slice(0, 24)]]))).code, "E_MODEL_STRUCTURE");
    });

    it("refuse an index out of range, a node cycle and a buffer shorter than it claims", async () => {
        const index = await refusalOf(
            cubeWith((json) => {
                (json.accessors as Json[])[0].bufferView = 99;
            }),
        );
        assert.strictEqual(index.code, "E_MODEL_STRUCTURE");
        const cycle = await refusalOf(
            cubeWith((json) => {
                json.nodes = [{ mesh: 0, children: [1] }, { children: [0] }];
            }),
        );
        assert.strictEqual(cycle.code, "E_MODEL_STRUCTURE");
        const short = await refusalOf(
            cubeWith((json) => {
                (json.buffers as Json[])[0].byteLength = 1_000_000;
            }),
        );
        assert.strictEqual(short.code, "E_MODEL_STRUCTURE");
    });

    it("refuse a required extension nothing here reads", async () => {
        const fact = await refusalOf(
            cubeWith((json) => {
                json.extensionsUsed = ["EXT_unknown_thing"];
                json.extensionsRequired = ["EXT_unknown_thing"];
            }),
        );
        assert.strictEqual(fact.code, "E_MODEL_FORMAT_UNSUPPORTED");
    });

    it("refuse a model over the triangle and texture limits", async () => {
        const plain = cubeWith(() => undefined);
        const triangles = await refusalOf(plain, { ...DEFAULT_MODEL_LIMITS, maxTriangles: 5 });
        assert.deepInclude(triangles, { code: "E_MODEL_TOO_LARGE" });
        assert.strictEqual(triangles.params.what, "triangles");
        const textures = await refusalOf(plain, { ...DEFAULT_MODEL_LIMITS, maxTextureBytes: 10 });
        assert.strictEqual(textures.params.what, "textureBytes");
    });
});

describe("withoutGltfPictures", () => {
    /**
     * A glTF whose two materials draw one picture each, in a folder.
     * @returns The JSON.
     */
    function painted(): Json {
        return {
            images: [{ uri: "maps/wood%20grain.png" }, { name: "Metal", uri: "metal.png" }],
            textures: [{ source: 0 }, { source: 1 }],
            materials: [
                { name: "wood", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } },
                { name: "metal", pbrMetallicRoughness: { baseColorTexture: { index: 1 } } },
            ],
        };
    }

    const colorOf = (json: Json, at: number): unknown =>
        ((json.materials as Json[])[at].pbrMetallicRoughness as Json).baseColorTexture;

    it("drops a picture whose file is skipped, by its path in the set beside the glTF", () => {
        const json = painted();
        assert.isTrue(withoutGltfPictures(json, new Set(), new Set(["models/maps/wood grain.png"]), "models/a.gltf"));
        assert.isUndefined(colorOf(json, 0), "the skipped picture is drawn without");
        assert.isDefined(colorOf(json, 1), "the other picture stays");
    });

    it("drops a picture by its summary name, and nothing when neither list names one", () => {
        const json = painted();
        assert.isFalse(withoutGltfPictures(json, new Set(["other"]), new Set(["other.png"])));
        assert.isDefined(colorOf(json, 1));
        assert.isTrue(withoutGltfPictures(json, new Set(["Metal"])));
        assert.isUndefined(colorOf(json, 1));
        assert.isDefined(colorOf(json, 0));
    });
});
