/**
 * The PLY reader and the glTF 1.0 upgrade at their corners: every PLY scalar type in both byte
 * orders, float colors and every texture-coordinate spelling, the damaged headers and bodies they
 * refuse; glTF 1.0 written with arrays, GLB version 1 containers that are damaged, embedded pictures,
 * samplers, strided accessors, a node with several meshes and the skins whose bind shape is not
 * folded in.
 */

import { assert, describe, it } from "vitest";

import { ModelReadError } from "../src/files/readers/geometry.js";
import { readGlb1, upgradeGltf1 } from "../src/files/readers/gltf1.js";
import { isSplatPly, plyTextureFile, readPly, readPlyHeader, readPlyPositions } from "../src/files/readers/ply.js";

/**
 * What a reader throws.
 * @param read - The reading.
 * @returns The rule of the ModelReadError it threw.
 */
function ruleOf(read: () => unknown): string {
    try {
        read();
    } catch (error) {
        assert.instanceOf(error, ModelReadError);
        return error.rule;
    }
    return assert.fail("it did not throw");
}

/**
 * A file's bytes from text.
 * @param text - The text.
 * @returns Its bytes.
 */
function bytesOf(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/**
 * A PLY header followed by a body.
 * @param lines - The header's lines between `ply` and `end_header`.
 * @param body - The body.
 * @returns The file.
 */
function ply(lines: string[], body: Uint8Array | string): Uint8Array {
    const head = bytesOf(["ply", ...lines, "end_header", ""].join("\n"));
    const rest = typeof body === "string" ? bytesOf(body) : body;
    const out = new Uint8Array(head.length + rest.length);
    out.set(head);
    out.set(rest, head.length);
    return out;
}

/** Writers of each PLY scalar type, by name, in either byte order. */
const WRITE: Record<string, [number, (v: DataView, o: number, x: number, little: boolean) => void]> = {
    char: [1, (v, o, x) => v.setInt8(o, x)],
    int8: [1, (v, o, x) => v.setInt8(o, x)],
    uchar: [1, (v, o, x) => v.setUint8(o, x)],
    uint8: [1, (v, o, x) => v.setUint8(o, x)],
    short: [2, (v, o, x, l) => v.setInt16(o, x, l)],
    int16: [2, (v, o, x, l) => v.setInt16(o, x, l)],
    ushort: [2, (v, o, x, l) => v.setUint16(o, x, l)],
    uint16: [2, (v, o, x, l) => v.setUint16(o, x, l)],
    int: [4, (v, o, x, l) => v.setInt32(o, x, l)],
    int32: [4, (v, o, x, l) => v.setInt32(o, x, l)],
    uint: [4, (v, o, x, l) => v.setUint32(o, x, l)],
    uint32: [4, (v, o, x, l) => v.setUint32(o, x, l)],
    float: [4, (v, o, x, l) => v.setFloat32(o, x, l)],
    float32: [4, (v, o, x, l) => v.setFloat32(o, x, l)],
    double: [8, (v, o, x, l) => v.setFloat64(o, x, l)],
    float64: [8, (v, o, x, l) => v.setFloat64(o, x, l)],
};

/**
 * A binary body of typed values.
 * @param values - Each value and its type, in order.
 * @param little - Little-endian.
 * @returns The bytes.
 */
function binary(values: [string, number][], little: boolean): Uint8Array {
    const size = values.reduce((sum, [type]) => sum + WRITE[type][0], 0);
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    let at = 0;
    for (const [type, value] of values) {
        WRITE[type][1](view, at, value, little);
        at += WRITE[type][0];
    }
    return out;
}

describe("the PLY reader at its corners", () => {
    it("reads every scalar type in both byte orders as the same point", () => {
        // One point whose x, y and z are written in each pair of types in turn.
        const types = Object.keys(WRITE);
        for (const little of [true, false]) {
            for (const type of types) {
                const file = ply(
                    [
                        `format binary_${little ? "little" : "big"}_endian 1.0`,
                        "element vertex 1",
                        `property ${type} x`,
                        `property ${type} y`,
                        `property ${type} z`,
                    ],
                    binary(
                        [
                            [type, 1],
                            [type, 2],
                            [type, 3],
                        ],
                        little,
                    ),
                );
                const header = readPlyHeader(file);
                assert.deepStrictEqual([...(readPlyPositions(file, header) ?? [])], [1, 2, 3], `${type} ${little}`);
            }
        }
    });

    it("reads a face list counted and indexed in any integer type", () => {
        const values: [string, number][] = [
            ["float", 0],
            ["float", 0],
            ["float", 0],
            ["float", 1],
            ["float", 0],
            ["float", 0],
            ["float", 0],
            ["float", 1],
            ["float", 0],
            ["ushort", 3],
            ["int", 0],
            ["int", 1],
            ["int", 2],
        ];
        const file = ply(
            [
                "format binary_big_endian 1.0",
                "element vertex 3",
                "property float x",
                "property float y",
                "property float z",
                "element face 1",
                "property list ushort int vertex_index",
            ],
            binary(values, false),
        );
        const read = readPly(file);
        assert.strictEqual(read.kind, "mesh");
        assert.strictEqual(read.geometry.indices.length, 3);
    });

    it("scales float colors to 0-255, keeps alpha, and reads diffuse_ colors", () => {
        const file = ply(
            [
                "format ascii 1.0",
                "element vertex 3",
                "property float x",
                "property float y",
                "property float z",
                "property float red",
                "property float green",
                "property float blue",
                "property float alpha",
                "element face 1",
                "property list uchar int vertex_indices",
            ],
            "0 0 0 1 0 0 0.5\n1 0 0 0 1 0 1\n0 1 0 0 0 1 1\n3 0 1 2\n",
        );
        const colors = readPly(file).geometry.colors ?? new Float32Array();
        // 0.5 of 255 is stored as a whole byte, 127, and read back over 255.
        assert.deepStrictEqual([...colors.slice(0, 4)], [1, 0, 0, 127 / 255].map(Math.fround));

        const diffuse = ply(
            [
                "format ascii 1.0",
                "element vertex 1",
                "property double x",
                "property double y",
                "property double z",
                "property uchar diffuse_red",
                "property uchar diffuse_green",
                "property uchar diffuse_blue",
            ],
            "0 0 0 255 128 0\n",
        );
        const points = readPly(diffuse);
        assert.strictEqual(points.kind, "points");
        assert.strictEqual(points.drawn, 1);
        assert.isDefined(points.geometry.colors);
    });

    it("reads normals and texture coordinates under each of their spellings", () => {
        for (const [u, v] of [
            ["s", "t"],
            ["u", "v"],
            ["texture_u", "texture_v"],
            ["texture_s", "texture_t"],
        ]) {
            const file = ply(
                [
                    "format ascii 1.0",
                    "comment made by a test",
                    "obj_info  TextureFile  wood grain.png",
                    "element vertex 3",
                    "property float x",
                    "property float y",
                    "property float z",
                    "property float nx",
                    "property float ny",
                    "property float nz",
                    `property float ${u}`,
                    `property float ${v}`,
                    "element face 1",
                    "property list uchar uint vertex_indices",
                ],
                "0 0 0 0 0 1 0 0\n1 0 0 0 0 1 1 0\n0 1 0 0 0 1 0 1\n3 0 1 2\n",
            );
            const read = readPly(file);
            assert.strictEqual(read.geometry.uvs?.length, 6, u);
            assert.strictEqual(read.geometry.normals?.length, 9, u);
            assert.strictEqual(read.textureFile, "wood grain.png", u);
        }
    });

    it("reads no picture from a comment that only names TextureFile", () => {
        const header = readPlyHeader(
            ply(["format ascii 1.0", "comment TextureFile", "comment texturefile  ", "element vertex 0"], ""),
        );
        assert.isUndefined(plyTextureFile(header));
    });

    it("reads a face list under any name when it is the face's only list", () => {
        const file = ply(
            [
                "format ascii 1.0",
                "element vertex 3",
                "property float x",
                "property float y",
                "property float z",
                "element face 1",
                "property list uchar int corners",
            ],
            "0 0 0\n1 0 0\n0 1 0\n4 0 1 2 0\n",
        );
        // A quad is a fan of two triangles.
        assert.strictEqual(readPly(file).geometry.indices.length, 6);
    });

    it("refuses headers that do not end, name an unknown format or type, or count badly", () => {
        const headers = [
            "solid\nend_header\n",
            "ply\nformat ascii 1.0\nelement vertex 1\n",
            "ply\nformat ascii 1.0\nend_header",
            "ply\nformat utf16 1.0\nend_header\n",
            "ply\nformat ascii 1.0\nelement vertex -1\nend_header\n",
            "ply\nformat ascii 1.0\nelement vertex many\nend_header\n",
            "ply\nformat ascii 1.0\nelement vertex 1\nproperty quaternion x\nend_header\n",
            "ply\nformat ascii 1.0\nelement face 1\nproperty list uchar quaternion vertex_indices\nend_header\n",
        ];
        for (const text of headers) {
            assert.strictEqual(
                ruleOf(() => readPlyHeader(bytesOf(text))),
                "header",
                text,
            );
        }
    });

    it("refuses bodies that end early, hold words, or give a list a bad length", () => {
        const xyz = ["element vertex 1", "property float x", "property float y", "property float z"];
        const bodies: [string[], Uint8Array | string][] = [
            [["format ascii 1.0", ...xyz], "0 0\n"],
            [["format ascii 1.0", ...xyz], "0 zero 0\n"],
            [["format binary_little_endian 1.0", ...xyz], new Uint8Array(8)],
            [["format ascii 1.0", ...xyz, "element face 1", "property list uchar int vertex_indices"], "0 0 0\n-1\n"],
            [
                ["format ascii 1.0", ...xyz, "element face 1", "property list uchar int vertex_indices"],
                "0 0 0\n1.5 0\n",
            ],
        ];
        for (const [lines, body] of bodies) {
            assert.strictEqual(
                ruleOf(() => readPly(ply(lines, body))),
                "ply",
                String(body),
            );
        }
    });

    it("refuses a file with no vertices, with no positions, or with faces but no face list", () => {
        const cases: [string[], string][] = [
            [["format ascii 1.0", "element face 0"], ""],
            [["format ascii 1.0", "element vertex 1", "property float x", "property float y"], "0 0\n"],
            [
                [
                    "format ascii 1.0",
                    "element vertex 1",
                    "property float x",
                    "property float y",
                    "property float z",
                    "element face 1",
                    "property uchar flags",
                ],
                "0 0 0\n1\n",
            ],
        ];
        for (const [lines, body] of cases) {
            assert.strictEqual(
                ruleOf(() => readPly(ply(lines, body))),
                "ply",
                lines.join(" "),
            );
        }
    });

    it("has no positions to give for a file with no vertex element", () => {
        const file = ply(["format ascii 1.0", "element face 0"], "");
        assert.isUndefined(readPlyPositions(file, readPlyHeader(file)));
    });

    it("tells PlayCanvas's compressed splat by its packed_position", () => {
        const header = readPlyHeader(
            ply(["format binary_little_endian 1.0", "element vertex 0", "property uint packed_position"], ""),
        );
        assert.isTrue(isSplatPly(header));
        assert.isFalse(isSplatPly(readPlyHeader(ply(["format ascii 1.0", "element vertex 0"], ""))));
    });
});

/**
 * A GLB version 1 container.
 * @param json - Its JSON content.
 * @param body - Its body.
 * @param patch - Changes to its header before it is returned.
 * @returns The bytes.
 */
function glb1(json: string, body = new Uint8Array(), patch?: (view: DataView) => void): Uint8Array {
    const content = bytesOf(json);
    const out = new Uint8Array(20 + content.length + body.length);
    const view = new DataView(out.buffer);
    out.set(bytesOf("glTF"));
    view.setUint32(4, 1, true);
    view.setUint32(8, out.length, true);
    view.setUint32(12, content.length, true);
    view.setUint32(16, 0, true);
    out.set(content, 20);
    out.set(body, 20 + content.length);
    patch?.(view);
    return out;
}

describe("a GLB version 1", () => {
    it("splits into its JSON and its body", () => {
        const { text, body } = readGlb1(glb1('{"a":1}', new Uint8Array([7, 8, 9])));
        assert.strictEqual(text, '{"a":1}');
        assert.deepStrictEqual([...body], [7, 8, 9]);
    });

    it("is refused when short, of another version, of another content format, overlong or not UTF-8", () => {
        const cases = [
            new Uint8Array(12),
            glb1("{}", undefined, (v) => v.setUint32(4, 2, true)),
            glb1("{}", undefined, (v) => v.setUint32(16, 1, true)),
            glb1("{}", undefined, (v) => v.setUint32(12, 999, true)),
            (() => {
                const bad = glb1("{}");
                bad[20] = 0xff;
                return bad;
            })(),
        ];
        for (const bytes of cases) {
            assert.strictEqual(
                ruleOf(() => readGlb1(bytes)),
                "json",
            );
        }
    });
});

describe("the glTF 1.0 upgrade at its corners", () => {
    it("reads dictionaries written as arrays, and keeps the GLB body as buffer 0 under the name given", () => {
        const json = {
            asset: { version: "1.0.1" },
            buffers: [{ byteLength: 4, uri: "other.bin" }, "not a buffer"],
            accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "SCALAR" }],
        };
        const upgraded = upgradeGltf1(json);
        assert.deepStrictEqual(upgraded.buffers, [{ byteLength: 4, uri: "other.bin" }, { byteLength: undefined }]);
        // The accessor's view index names nothing in the array of views, so it has none.
        assert.notProperty((upgraded.accessors as object[])[0], "bufferView");

        const glb = upgradeGltf1({ buffers: { other: { byteLength: 4 }, binary_glTF: { byteLength: 8 } } }, "body.bin");
        assert.deepStrictEqual(glb.buffers, [{ byteLength: 8, uri: "body.bin" }, { byteLength: 4 }]);
        const unnamed = upgradeGltf1({ buffers: { binary_glTF: { byteLength: 8 } } });
        assert.deepStrictEqual(unnamed.buffers, [{ byteLength: 8 }]);
    });

    it("gives a strided accessor a view of its own with the stride, and keeps a tight one unstrided", () => {
        const upgraded = upgradeGltf1({
            buffers: { b: { byteLength: 100 } },
            bufferViews: { v: { buffer: "b", byteOffset: 4, byteLength: 96 } },
            accessors: {
                strided: {
                    bufferView: "v",
                    byteOffset: 8,
                    byteStride: 24,
                    componentType: 5126,
                    count: 3,
                    type: "VEC3",
                },
                tight: { bufferView: "v", byteStride: 4, componentType: 5123, type: "VEC2", min: [0], max: [1] },
            },
        });
        const [strided, tight] = upgraded.accessors as Record<string, unknown>[];
        const views = upgraded.bufferViews as Record<string, unknown>[];
        assert.deepStrictEqual(views[strided.bufferView as number], {
            buffer: 0,
            byteOffset: 12,
            byteLength: 24 * 2 + 12,
            byteStride: 24,
        });
        assert.deepStrictEqual(views[tight.bufferView as number], { buffer: 0, byteOffset: 4, byteLength: 4 });
        assert.strictEqual(tight.count, 0);
        assert.deepStrictEqual(tight.max, [1]);
    });

    it("upgrades embedded pictures, samplers, textures and a common-material texture", () => {
        const upgraded = upgradeGltf1({
            bufferViews: { pic: { buffer: "binary_glTF" } },
            images: {
                inside: { extensions: { KHR_binary_glTF: { bufferView: "pic", mimeType: "image/png" } } },
                outside: { uri: "wood.png" },
            },
            samplers: { s: { magFilter: 9729, minFilter: "linear", wrapS: 10497 } },
            textures: { inside: { source: "inside", sampler: "s" }, outside: { source: "outside" } },
            materials: {
                common: { extensions: { KHR_materials_common: { values: { diffuse: "outside" } } } },
                named: { name: "Named", values: { diffuse: [0.5, "red"] } },
                missing: { values: { diffuse: "no such texture" } },
            },
        });
        assert.deepStrictEqual(upgraded.images, [{ bufferView: 0, mimeType: "image/png" }, { uri: "wood.png" }]);
        assert.deepStrictEqual(upgraded.samplers, [{ magFilter: 9729, wrapS: 10497 }]);
        assert.deepStrictEqual(upgraded.textures, [{ source: 0, sampler: 0 }, { source: 1 }]);
        const [common, named, missing] = upgraded.materials as {
            name: unknown;
            pbrMetallicRoughness: Record<string, unknown>;
        }[];
        assert.deepStrictEqual(common.pbrMetallicRoughness.baseColorTexture, { index: 1 });
        assert.strictEqual(common.name, "common");
        assert.deepStrictEqual(named.pbrMetallicRoughness.baseColorFactor, [0.5, 1, 1, 1]);
        assert.strictEqual(named.name, "Named");
        assert.deepStrictEqual(missing.pbrMetallicRoughness, { metallicFactor: 0, roughnessFactor: 1 });
    });

    it("keeps indices, a 1.0 primitive's mode and only the attributes glTF 2.0 knows", () => {
        const upgraded = upgradeGltf1({
            accessors: { pos: {}, idx: {}, uv: {} },
            meshes: {
                m: {
                    primitives: [
                        {
                            attributes: { POSITION: "pos", TEXCOORD_1: "uv", JOINT_2: "uv", BINORMAL: "uv" },
                            indices: "idx",
                            primitive: 1,
                        },
                        "not a primitive",
                    ],
                },
                empty: {},
            },
        });
        const [m, empty] = upgraded.meshes as { primitives: Record<string, unknown>[] }[];
        assert.deepStrictEqual(m.primitives, [
            { attributes: { POSITION: 0, TEXCOORD_1: 2, JOINTS_2: 2 }, mode: 1, indices: 1 },
        ]);
        assert.deepStrictEqual(empty.primitives, []);
    });

    it("gives a node with several meshes a child for each after the first, which keeps its skin", () => {
        const upgraded = upgradeGltf1({
            meshes: { a: {}, b: {}, c: {} },
            skins: { s: { jointNames: ["j", "nobody"] } },
            nodes: {
                body: { meshes: ["a", "b", "missing", "c"], skin: "s", children: ["joint"], scale: [1, 1, 1] },
                joint: { jointName: "j", mesh: "a" },
                loose: { jointName: "j" },
            },
            scenes: { s: { nodes: ["body", "nope"] } },
            scene: "elsewhere",
        });
        const nodes = upgraded.nodes as Record<string, unknown>[];
        assert.deepStrictEqual(nodes[0], { scale: [1, 1, 1], children: [1, 3, 4], mesh: 0, skin: 0 });
        assert.deepStrictEqual(nodes[3], { mesh: 1, skin: 0 });
        assert.deepStrictEqual(nodes[4], { mesh: 2, skin: 0 });
        assert.deepStrictEqual(nodes[1], { mesh: 0 });
        // With no skeleton roots, each joint name is the first node of that name.
        assert.deepStrictEqual(upgraded.skins, [{ joints: [1, undefined] }]);
        assert.deepStrictEqual(upgraded.scenes, [{ nodes: [0] }]);
        assert.notProperty(upgraded, "scene");
    });

    it("finds joints under the skeleton roots first, even through a loop in the hierarchy", () => {
        const upgraded = upgradeGltf1({
            skins: { s: { jointNames: ["hip"] } },
            nodes: {
                stray: { jointName: "hip" },
                body: { skin: "s", skeletons: ["root", "nobody"] },
                root: { children: ["hip", "root"] },
                hip: { jointName: "hip", children: ["root"] },
            },
        });
        assert.deepStrictEqual(upgraded.skins, [{ joints: [3], skeleton: 2 }]);
    });

    /**
     * A one-joint skin whose bind shape scales by 2, with its inverse bind matrix in a buffer.
     * @param ibm - The inverse bind matrix accessor's fields, or none for no accessor.
     * @returns The glTF 1.0 JSON.
     */
    function skinned(ibm?: Record<string, unknown>): Record<string, unknown> {
        return {
            buffers: { b: { byteLength: 64 } },
            bufferViews: { v: { buffer: "b", byteLength: 64 } },
            accessors: ibm === undefined ? {} : { ibm: { bufferView: "v", count: 1, type: "MAT4", ...ibm } },
            skins: {
                s: {
                    bindShapeMatrix: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
                    ...(ibm === undefined ? {} : { inverseBindMatrices: "ibm" }),
                    jointNames: ["j"],
                },
            },
            nodes: { body: { skin: "s" }, j: { jointName: "j" } },
        };
    }

    /** The identity matrix's bytes. */
    const IDENTITY = new Uint8Array(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]).buffer);

    it("folds the bind shape into identity matrices when the skin has no inverse bind matrices", () => {
        const upgraded = upgradeGltf1(skinned());
        const skin = (upgraded.skins as Record<string, unknown>[])[0];
        const accessor = (upgraded.accessors as Record<string, unknown>[])[skin.inverseBindMatrices as number];
        assert.deepStrictEqual(accessor, { bufferView: 1, componentType: 5126, count: 1, type: "MAT4" });
    });

    it("keeps the inverse bind matrices unfolded when they cannot be read", () => {
        const unreadable: [Record<string, unknown>, ((id: string) => Uint8Array | undefined) | undefined][] = [
            // No bytes for the buffer.
            [{ componentType: 5126 }, undefined],
            [{ componentType: 5126 }, () => undefined],
            // Not floats.
            [{ componentType: 5123 }, () => IDENTITY],
            // Too few bytes for the matrix.
            [{ componentType: 5126 }, () => IDENTITY.subarray(0, 32)],
        ];
        for (const [ibm, bytes] of unreadable) {
            const upgraded = upgradeGltf1(skinned(ibm), undefined, bytes);
            assert.deepStrictEqual(upgraded.skins, [{ joints: [1], inverseBindMatrices: 0 }], JSON.stringify(ibm));
        }

        // A bind shape that is the identity, or not sixteen numbers, is not folded either.
        for (const bindShapeMatrix of [
            [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [2, 0, 0],
            [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, "1"],
        ]) {
            const json = skinned({ componentType: 5126 });
            (json.skins as { s: Record<string, unknown> }).s.bindShapeMatrix = bindShapeMatrix;
            assert.deepStrictEqual(upgradeGltf1(json, undefined, () => IDENTITY).skins, [
                { joints: [1], inverseBindMatrices: 0 },
            ]);
        }
    });

    it("merges every animation into one clip, keeps an input's own range and reads a strided one", () => {
        // Times 3, 1, 2 at a stride of 8 bytes, the other 4 bytes of each step unused.
        const times = new Uint8Array(new Float32Array([3, 99, 1, 99, 2]).buffer);
        const upgraded = upgradeGltf1(
            {
                buffers: { b: { byteLength: 20 } },
                bufferViews: { v: { buffer: "b", byteLength: 20 } },
                accessors: {
                    t: { bufferView: "v", byteStride: 8, componentType: 5126, count: 3, type: "SCALAR" },
                    ranged: { bufferView: "v", componentType: 5126, count: 1, type: "SCALAR", min: [0], max: [5] },
                    empty: { bufferView: "v", componentType: 5126, count: 0, type: "SCALAR" },
                    out: { bufferView: "v", componentType: 5126, count: 3, type: "VEC3" },
                },
                nodes: { n: {} },
                animations: {
                    a: {
                        parameters: { TIME: "t", translation: "out" },
                        samplers: { s: { input: "TIME", output: "translation", interpolation: "STEP" } },
                        channels: [{ sampler: "s", target: { id: "n", path: "translation" } }, "not a channel"],
                    },
                    b: {
                        parameters: { TIME: "ranged" },
                        samplers: { s: { input: "TIME", output: "missing" } },
                        channels: [{ sampler: "s" }],
                    },
                    c: { parameters: { TIME: "empty" }, samplers: { s: { input: "TIME" } } },
                    d: { samplers: { s: { input: "nothing" } } },
                },
            },
            undefined,
            () => times,
        );
        const [clip] = upgraded.animations as { samplers: Record<string, unknown>[]; channels: unknown[] }[];
        assert.deepStrictEqual(clip.samplers, [
            { input: 0, output: 3, interpolation: "STEP" },
            { input: 1, output: undefined, interpolation: "LINEAR" },
            { input: 2, output: undefined, interpolation: "LINEAR" },
            { input: undefined, output: undefined, interpolation: "LINEAR" },
        ]);
        assert.deepStrictEqual(clip.channels, [
            { sampler: 0, target: { node: 0, path: "translation" } },
            { sampler: 1, target: { node: undefined, path: undefined } },
        ]);
        const accessors = upgraded.accessors as Record<string, unknown>[];
        assert.deepStrictEqual([accessors[0].min, accessors[0].max], [[1], [3]]);
        assert.deepStrictEqual([accessors[1].min, accessors[1].max], [[0], [5]]);
        assert.notProperty(accessors[2], "max");
    });

    it("leaves an input's range out when its values run past the buffer", () => {
        const upgraded = upgradeGltf1(
            {
                buffers: { b: { byteLength: 4 } },
                bufferViews: { v: { buffer: "b", byteLength: 4 } },
                accessors: { t: { bufferView: "v", componentType: 5126, count: 4, type: "SCALAR" } },
                animations: { a: { parameters: { TIME: "t" }, samplers: { s: { input: "TIME" } } } },
            },
            undefined,
            () => new Uint8Array(4),
        );
        assert.notProperty((upgraded.accessors as object[])[0], "max");
    });
});
