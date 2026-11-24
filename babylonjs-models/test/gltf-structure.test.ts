/**
 * The glTF checks on a one-triangle glTF built here, changed one field at a time: what each check
 * refuses, what it counts, and where it places the model's box.
 */

import { assert, describe, it } from "vitest";

import {
    checkGltf,
    type GltfChecked,
    parseGltfJson,
    readGlb,
    WITHOUT_PICTURE_EXTRA,
    withoutGltfPictures,
} from "../src/files/gltfChecks.js";
import { DEFAULT_MODEL_LIMITS, type ModelLimits } from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

/** A glTF's JSON, edited by a test. */
type Json = Record<string, unknown>;

/** Extension names, spelled as glTF spells them. */
const MESHOPT = "EXT_meshopt_compression";
const INSTANCING = "EXT_mesh_gpu_instancing";
const DRACO = "KHR_draco_mesh_compression";
const SPLAT = "KHR_gaussian_splatting";

/**
 * The buffer: a triangle's three positions (0..36), its three indices (36..42), then at 44 one
 * inverse bind matrix that moves 10 along -x.
 * @returns The bytes.
 */
function triangleBin(): Uint8Array {
    const bytes = new Uint8Array(108);
    const view = new DataView(bytes.buffer);
    [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => view.setFloat32(i * 4, v, true));
    [0, 1, 2].forEach((v, i) => view.setUint16(36 + i * 2, v, true));
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -10, 0, 0, 1];
    matrix.forEach((v, i) => view.setFloat32(44 + i * 4, v, true));
    return bytes;
}

/**
 * A glTF drawing one triangle from `t.bin`.
 * @returns The JSON.
 */
function triangle(): Json {
    return {
        asset: { version: "2.0" },
        buffers: [{ uri: "t.bin", byteLength: 108 }],
        bufferViews: [
            { buffer: 0, byteLength: 36 },
            { buffer: 0, byteOffset: 36, byteLength: 6 },
            { buffer: 0, byteOffset: 44, byteLength: 64 },
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
            { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
    };
}

/**
 * Check the triangle after a change.
 * @param change - Edits the JSON.
 * @param limits - The limits.
 * @returns What the check returns.
 */
function check(change: (json: Json) => void, limits: ModelLimits = DEFAULT_MODEL_LIMITS): GltfChecked {
    const json = triangle();
    change(json);
    return checkGltf({ json, path: "t.gltf", files: new Map([["t.bin", triangleBin()]]), limits, format: "gltf" });
}

/**
 * The fact a call refuses with.
 * @param run - The call.
 * @returns The fact.
 */
function refusal(run: () => unknown): ModelError["fact"] {
    try {
        run();
    } catch (error) {
        assert.instanceOf(error, ModelError);
        return error.fact;
    }

    return assert.fail("accepted");
}

/**
 * The fact checking the changed triangle refuses with.
 * @param change - Edits the JSON.
 * @param limits - The limits.
 * @returns The fact.
 */
function refused(change: (json: Json) => void, limits?: ModelLimits): ModelError["fact"] {
    return refusal(() => check(change, limits));
}

/** The triangle's first primitive. */
const primitiveOf = (json: Json): Json => ((json.meshes as Json[])[0].primitives as Json[])[0];

describe("parseGltfJson", () => {
    it("reads an escaped quote inside a key, and refuses a duplicate or __proto__ key", () => {
        assert.deepEqual(parseGltfJson('{"a\\"b": 1, "c": [1, {"a\\"b": 2}]}'), { 'a"b': 1, c: [1, { 'a"b': 2 }] });
        assert.deepEqual(refusal(() => parseGltfJson('{"a": 1, "a": 2}')).params, { rule: "json", key: "a" });
        assert.deepEqual(refusal(() => parseGltfJson('{"__proto__": {}}')).params, { rule: "json", key: "__proto__" });
    });

    it("refuses JSON nested over 64 deep, and JSON that is not an object", () => {
        assert.deepEqual(refusal(() => parseGltfJson(`${"[".repeat(65)}${"]".repeat(65)}`)).params, {
            rule: "depth",
        });
        assert.isOk(parseGltfJson(`{"a":${"[".repeat(63)}${"]".repeat(63)}}`));
        assert.deepEqual(refusal(() => parseGltfJson("[1, 2]")).params, { rule: "json" });
    });
});

describe("readGlb", () => {
    /**
     * A GLB around JSON text and an optional binary chunk.
     * @param text - The JSON, padded with spaces to 4 bytes.
     * @param options - Changes to the container.
     * @param options.version - The header's version.
     * @param options.jsonType - The JSON chunk's type.
     * @param options.bin - The binary chunk.
     * @param options.binLength - The binary chunk's declared length.
     * @returns The bytes.
     */
    function glb(
        text: string,
        options: { version?: number; jsonType?: number; bin?: Uint8Array; binLength?: number } = {},
    ): Uint8Array {
        const json = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4, " "));
        const { bin } = options;
        const length = 20 + json.length + (bin === undefined ? 0 : 8 + bin.length);
        const bytes = new Uint8Array(length);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, 0x46546c67, true);
        view.setUint32(4, options.version ?? 2, true);
        view.setUint32(8, length, true);
        view.setUint32(12, json.length, true);
        view.setUint32(16, options.jsonType ?? 0x4e4f534a, true);
        bytes.set(json, 20);
        if (bin !== undefined) {
            view.setUint32(20 + json.length, options.binLength ?? bin.length, true);
            view.setUint32(24 + json.length, 0x004e4942, true);
            bytes.set(bin, 28 + json.length);
        }

        return bytes;
    }

    it("splits a GLB into its JSON text and binary chunk", () => {
        const read = readGlb(glb("{}", { bin: new Uint8Array([1, 2, 3, 4]) }));
        assert.strictEqual(read.text.trim(), "{}");
        assert.deepEqual([...(read.bin ?? [])], [1, 2, 3, 4]);
        assert.isUndefined(readGlb(glb("{}")).bin);
    });

    it("refuses a version 1 GLB, a first chunk that is not JSON, and a binary chunk longer than the file", () => {
        assert.deepEqual(
            refusal(() => readGlb(glb("{}", { version: 1 }))),
            {
                code: "E_MODEL_FORMAT_UNSUPPORTED",
                params: { format: "glb1" },
            },
        );
        assert.deepEqual(refusal(() => readGlb(glb("{}", { jsonType: 0x004e4942 }))).params, { rule: "json" });
        const long = glb("{}", { bin: new Uint8Array(4), binLength: 400 });
        assert.deepEqual(refusal(() => readGlb(long)).params, { rule: "length" });
    });
});

describe("checkGltf", () => {
    it("summarizes the triangle: one triangle, its box, no animations", () => {
        const { summary, warnings } = check(() => undefined);
        assert.strictEqual(summary.triangles, 1);
        assert.deepEqual(summary.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
        assert.strictEqual(summary.gltfVersion, "2.0");
        assert.deepEqual(warnings, []);
    });

    it("refuses a file that is not glTF 2, and a Gaussian splat named only in extensionsUsed", () => {
        assert.deepEqual(
            refused((json) => {
                delete json.asset;
            }),
            { code: "E_MODEL_FORMAT_UNSUPPORTED", params: { format: "gltf", fileName: "t.gltf" } },
        );
        assert.deepInclude(
            refused((json) => {
                json.extensionsUsed = [SPLAT];
            }).params,
            { kind: "splat", extension: SPLAT },
        );
    });

    it("counts triangles by primitive mode: strips and fans draw count - 2, lines none", () => {
        const drawn = (mode: number): number =>
            check((json) => {
                primitiveOf(json).mode = mode;
            }).summary.triangles;
        assert.deepEqual([4, 5, 6, 1, 0].map(drawn), [1, 1, 1, 0, 0]);
        const bare = check((json) => {
            primitiveOf(json).attributes = {};
            delete primitiveOf(json).indices;
        });
        assert.strictEqual(bare.summary.triangles, 0, "nothing to count");
        assert.isUndefined(bare.summary.bounds, "no positions, no box");
        const empty = check((json) => {
            delete (json.meshes as Json[])[0].primitives;
        });
        assert.strictEqual(empty.summary.triangles, 0);
        assert.isUndefined(empty.summary.vertexColors);
    });

    it("refuses a top-level list that is not a list of objects, and a primitive that is not an object", () => {
        assert.deepEqual(
            refused((json) => {
                json.nodes = { 0: { mesh: 0 } };
            }).params,
            { rule: "json", key: "nodes" },
        );
        assert.deepEqual(
            refused((json) => {
                (json.meshes as Json[])[0].primitives = [3];
            }).params,
            { rule: "json", key: "mesh.primitives" },
        );
    });

    it("refuses node children that are not a list, a node that is its own child, and a node with two parents", () => {
        const rule = (nodes: Json[]): unknown =>
            refused((json) => {
                json.nodes = nodes;
            }).params.rule;
        assert.strictEqual(rule([{ mesh: 0, children: 1 }, {}]), "json");
        assert.strictEqual(rule([{ mesh: 0, children: [0] }]), "cycle");
        assert.strictEqual(rule([{ mesh: 0, children: [2] }, { children: [2] }, {}]), "parent");
    });

    it("refuses a node tree over 64 deep", () => {
        const chain = (length: number) => (json: Json) => {
            json.nodes = Array.from({ length }, (_, i) => (i + 1 < length ? { children: [i + 1] } : { mesh: 0 }));
        };
        assert.strictEqual(check(chain(64)).summary.triangles, 1);
        assert.deepEqual(refused(chain(65)).params, { rule: "depth" });
    });

    it("draws every root without scenes, nothing for a scene with no nodes, and a node listed twice once", () => {
        const twoRoots = (json: Json): void => {
            json.nodes = [{ mesh: 0 }, { mesh: 0, translation: [0, 0, 5] }];
        };
        const unscened = check((json) => {
            twoRoots(json);
            delete json.scenes;
        });
        assert.strictEqual(unscened.summary.triangles, 2);
        assert.deepEqual(unscened.summary.bounds, { min: [0, 0, 0], max: [1, 1, 5] });
        const empty = check((json) => {
            json.scenes = [{}, { nodes: "every" }];
        });
        assert.strictEqual(empty.summary.triangles, 0);
        assert.isUndefined(empty.summary.bounds);
        const twice = check((json) => {
            json.scenes = [{ nodes: [0, 0] }];
        });
        assert.strictEqual(twice.summary.triangles, 1);
        assert.deepEqual(
            refused((json) => {
                json.scenes = [{ nodes: 0 }];
            }).params,
            { rule: "json", key: "scene.nodes" },
        );
    });

    it("refuses a buffer it cannot find bytes for, and a negative length", () => {
        const where = (buffer: Json): unknown =>
            refused((json) => {
                json.buffers = [buffer];
            }).params;
        assert.deepEqual(where({ byteLength: 108 }), { rule: "accessor", where: "buffer" });
        assert.deepEqual(where({ uri: 7, byteLength: 108 }), { rule: "json", key: "buffer.uri" });
        assert.deepEqual(where({ uri: "t.bin", byteLength: -1 }), { rule: "accessor", where: "buffer.byteLength" });
    });

    it("reads a meshopt view's range from its source buffer, and refuses one that reaches past it", () => {
        /**
         * The triangle's positions read through a meshopt view whose fallback is buffer 0.
         * @param meshopt - The view's meshopt extension.
         * @returns The change.
         */
        const compressed = (meshopt: Json) => (json: Json) => {
            json.buffers = [
                { byteLength: 36, extensions: { [MESHOPT]: { fallback: true } } },
                { uri: "t.bin", byteLength: 108 },
            ];
            json.bufferViews = [
                { buffer: 0, byteLength: 36, extensions: { [MESHOPT]: meshopt } },
                { buffer: 1, byteOffset: 36, byteLength: 6 },
            ];
        };
        const good = { buffer: 1, byteLength: 36, count: 3, byteStride: 12 };
        assert.strictEqual(check(compressed(good)).summary.triangles, 1);
        assert.deepEqual(refused(compressed({ ...good, buffer: undefined })).params, {
            rule: "index",
            where: "meshopt.buffer",
        });
        assert.deepEqual(refused(compressed({ ...good, byteOffset: 100 })).params, {
            rule: "accessor",
            where: "meshopt",
        });
        assert.deepEqual(refused(compressed({ ...good, count: 4 })).params, { rule: "accessor", where: "meshopt" });
        // The limit counts what the views decode to.
        assert.strictEqual(
            refused(compressed(good), { ...DEFAULT_MODEL_LIMITS, maxDecodedBytes: 36 + 36 }).params.what,
            "decodedBytes",
        );
    });

    it("refuses a view with no buffer or past its buffer, and an accessor past its view", () => {
        assert.deepEqual(
            refused((json) => {
                delete (json.bufferViews as Json[])[0].buffer;
            }).params,
            { rule: "index", where: "bufferView.buffer" },
        );
        assert.deepEqual(
            refused((json) => {
                (json.bufferViews as Json[])[2].byteLength = 65;
            }).params,
            { rule: "accessor", where: "bufferView" },
        );
        assert.deepEqual(
            refused((json) => {
                (json.accessors as Json[])[0].byteOffset = 4;
            }).params,
            { rule: "accessor", where: "accessor" },
        );
        // A stride of 0 means tightly packed.
        assert.strictEqual(
            check((json) => {
                (json.bufferViews as Json[])[0].byteStride = 0;
            }).summary.triangles,
            1,
        );
    });

    it("refuses an accessor of no known type or with no elements, and decoded data over the limit", () => {
        const accessor = (change: Json) => (json: Json) => {
            Object.assign((json.accessors as Json[])[1], change);
        };
        assert.deepEqual(refused(accessor({ type: "VEC5" })).params, { rule: "accessor", where: "accessor.type" });
        assert.deepEqual(refused(accessor({ componentType: 1 })).params, {
            rule: "accessor",
            where: "accessor.type",
        });
        assert.deepEqual(refused(accessor({ count: 0 })).params, { rule: "accessor", where: "accessor.count" });
        assert.deepEqual(refused(() => undefined, { ...DEFAULT_MODEL_LIMITS, maxDecodedBytes: 40 }).params, {
            what: "decodedBytes",
            found: 42,
            limit: 40,
        });
    });

    it("fits a sparse accessor's indices and values in their views, and counts them as decoded data", () => {
        const sparse = (value: Json) => (json: Json) => {
            (json.accessors as Json[])[0].sparse = value;
        };
        const good = {
            count: 1,
            indices: { bufferView: 1, componentType: 5123 },
            values: { bufferView: 0 },
        };
        assert.strictEqual(check(sparse(good)).summary.triangles, 1);
        // Nothing to place: no views named.
        assert.strictEqual(check(sparse({ count: 2 })).summary.triangles, 1);
        assert.deepEqual(refused(sparse({ ...good, count: 4 })).params, { rule: "accessor", where: "accessor" });
        // 36 + 6 for the accessors, 1 * (12 + 2) for the sparse part.
        assert.deepEqual(refused(sparse(good), { ...DEFAULT_MODEL_LIMITS, maxDecodedBytes: 55 }).params, {
            what: "decodedBytes",
            found: 56,
            limit: 55,
        });
    });

    it("draws each GPU instance, and refuses instance attributes whose counts differ or are missing", () => {
        const instanced = (attributes: unknown) => (json: Json) => {
            (json.nodes as Json[])[0].extensions = { [INSTANCING]: attributes };
            // Accessor 2 holds two translations.
            (json.accessors as Json[]).push({ bufferView: 2, componentType: 5126, count: 2, type: "VEC3" });
        };
        assert.strictEqual(check(instanced({ attributes: { TRANSLATION: 2 } })).summary.triangles, 2);
        assert.deepEqual(refused(instanced({ attributes: { TRANSLATION: 2, SCALE: 0 } })).params, {
            rule: "instancing",
        });
        assert.deepEqual(refused(instanced(true)).params, { rule: "instancing" });
    });

    it("places a skinned mesh where its first joint draws it, through the joint's inverse bind matrix", () => {
        const skinned = (skin: Json) => (json: Json) => {
            json.nodes = [{ mesh: 0, skin: 0, translation: [5, 0, 0] }, { translation: [10, 0, 0] }];
            json.scenes = [{ nodes: [0, 1] }];
            json.skins = [skin];
            (json.accessors as Json[]).push(
                { bufferView: 2, componentType: 5126, count: 1, type: "MAT4" },
                { bufferView: 2, componentType: 5123, count: 1, type: "MAT4" },
            );
        };
        const xOf = (skin: Json): [number, number] => {
            const { bounds } = check(skinned(skin)).summary;
            return [bounds?.min[0] ?? Number.NaN, bounds?.max[0] ?? Number.NaN];
        };
        assert.deepEqual(xOf({ joints: [1] }), [10, 11], "no inverse bind matrices: at the joint");
        assert.deepEqual(xOf({ joints: [1], inverseBindMatrices: 2 }), [0, 1], "the matrix moves it back by 10");
        assert.deepEqual(xOf({ joints: [1], inverseBindMatrices: 3 }), [5, 6], "unreadable: where its node is");
        assert.deepEqual(xOf({}), [5, 6], "no joints: where its node is");
        assert.isTrue(check(skinned({})).summary.skinned);
    });

    it("refuses a Draco primitive with no buffer view, and reads its attribute ids", () => {
        const draco = (extension: unknown) => (json: Json) => {
            primitiveOf(json).extensions = { [DRACO]: extension };
        };
        assert.strictEqual(check(draco({ bufferView: 0, attributes: { POSITION: 0 } })).summary.triangles, 1);
        assert.strictEqual(check(draco({ bufferView: 0, attributes: "none" })).summary.triangles, 1);
        assert.deepEqual(refused(draco({ attributes: {} })).params, { rule: "index", where: "draco.bufferView" });
        assert.deepEqual(refused(draco(true)).params, { rule: "index", where: "draco.bufferView" });
        assert.deepEqual(refused(draco({ bufferView: 0, attributes: { POSITION: -1 } })).params, {
            rule: "accessor",
            where: "draco.attributes",
        });
    });

    it("refuses an image with neither a uri nor a buffer view", () => {
        assert.deepEqual(
            refused((json) => {
                json.images = [{ mimeType: "image/png" }];
            }).params,
            { rule: "image", name: "image 0" },
        );
    });

    it("times a clip by its samplers' inputs, and skips samplers and channels it cannot read", () => {
        const { summary, warnings } = check((json) => {
            (json.accessors as Json[]).push({
                bufferView: 0,
                componentType: 5126,
                count: 3,
                type: "SCALAR",
                max: [2.5],
            });
            json.animations = [
                {
                    name: "spin",
                    samplers: [{ input: 2, output: 0 }, "broken", { output: 0 }],
                    channels: [{ sampler: 0, target: "node" }, 4],
                },
                {},
            ];
        });
        assert.deepEqual(summary.animations, [
            { name: "spin", seconds: 2.5 },
            { name: "animation1", seconds: 0 },
        ]);
        assert.deepInclude(warnings, { code: "W_MODEL_HAS_ANIMATIONS", params: { clips: ["spin", "animation1"] } });
    });

    it("counts no joints for a skin that lists none", () => {
        const { summary } = check((json) => {
            json.skins = [{}];
        });
        assert.isTrue(summary.skinned);
        assert.strictEqual(
            refused(
                (json) => {
                    json.skins = [{}, { joints: [0] }];
                },
                { ...DEFAULT_MODEL_LIMITS, maxJoints: 0 },
            ).params.item,
            "joints",
        );
    });
});

describe("withoutGltfPictures on unusual materials", () => {
    /**
     * A glTF whose one material draws picture 0 as its color and picture 1 as its normals.
     * @param extras - The material's extras.
     * @returns The JSON.
     */
    function material(extras?: unknown): Json {
        return {
            images: [{ uri: "color.png" }, { uri: "data:image/png;base64,AAAA" }, { uri: "bump.png" }],
            textures: [{ source: 0 }, { source: 1 }, { source: 2 }],
            materials: [
                {
                    ...(extras === undefined ? {} : { extras }),
                    pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
                    normalTexture: { index: 2 },
                    occlusionTexture: { index: 1 },
                },
            ],
        };
    }

    const first = (json: Json): Json => (json.materials as Json[])[0];

    it("drops a normal map without saying the material lost its color", () => {
        const json = material();
        assert.isTrue(withoutGltfPictures(json, new Set(["bump.png"])));
        assert.isUndefined(first(json).normalTexture);
        assert.isUndefined(first(json).extras);
    });

    it("keeps extras that are not an object as they are", () => {
        const json = material("written by hand");
        assert.isTrue(withoutGltfPictures(json, new Set(["color.png"])));
        assert.strictEqual(first(json).extras, "written by hand");
        const marked = material({ note: 1 });
        withoutGltfPictures(marked, new Set(["color.png"]));
        assert.deepEqual(first(marked).extras, { note: 1, [WITHOUT_PICTURE_EXTRA]: true });
    });

    it("never matches an embedded picture by a skipped path, and drops nothing from a glTF with no lists", () => {
        const json = material();
        assert.isFalse(withoutGltfPictures(json, new Set(), new Set(["image1"])));
        assert.isDefined(first(json).occlusionTexture);
        assert.isFalse(withoutGltfPictures({}, new Set(["color.png"])));
    });
});
