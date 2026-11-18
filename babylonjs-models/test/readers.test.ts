/**
 * The readers and checks of every format babylonjs-models reads, over the variant fixtures
 * (test/fixtures/variants, written by its generate.ts): detection, the STL, PLY and .babylon
 * readers, points drawn as solids, Gaussian splats recognized and refused, the glTF 1.0 upgrade and
 * picture sizes.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";
import { assert, describe, it } from "vitest";

import { BUILT_IN_MODEL_FORMATS, detectModelFormat } from "../src/files/detect.js";
import { checkGltf, parseGltfJson } from "../src/files/gltfChecks.js";
import { DEFAULT_MODEL_LIMITS } from "../src/files/limits.js";
import { readBabylon } from "../src/files/readers/babylon.js";
import { MAX_POINTS_DRAWN, ModelReadError, pointsToSolids } from "../src/files/readers/geometry.js";
import { isGltf1, readGlb1, upgradeGltf1 } from "../src/files/readers/gltf1.js";
import { readPly } from "../src/files/readers/ply.js";
import { readStl, stlFacts } from "../src/files/readers/stl.js";
import { imageSize, textureBytesOf } from "../src/files/references.js";
import { hasReader } from "../src/load/loadModel.js";

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

describe("detecting the formats babylonjs-models reads", () => {
    it("reads glTF 1.0 and .babylon", () => {
        assert.deepStrictEqual(detectModelFormat({ head: fixture("glb1", "cube.glb") }), {
            format: "glb",
            supported: true,
        });
        assert.deepStrictEqual(
            detectModelFormat({ filename: "cube.babylon", head: fixture("babylon", "cube.babylon") }),
            {
                format: "babylon",
                supported: true,
            },
        );
    });

    it("does not support a glTF or GLB that uses Gaussian splatting", () => {
        const json = '{"asset":{"version":"2.0"},"extensionsUsed":["KHR_gaussian_splatting"]}';
        const bytes = new TextEncoder().encode(json);
        const glb = new Uint8Array(20 + bytes.length);
        const view = new DataView(glb.buffer);
        glb.set(new TextEncoder().encode("glTF"));
        view.setUint32(4, 2, true);
        view.setUint32(8, glb.length, true);
        view.setUint32(12, bytes.length, true);
        view.setUint32(16, 0x4e4f534a, true);
        glb.set(bytes, 20);
        assert.deepStrictEqual(detectModelFormat({ head: glb }), { format: "glb", supported: false });
        assert.deepStrictEqual(detectModelFormat({ filename: "s.gltf", head: bytes }), {
            format: "gltf",
            supported: false,
        });
    });

    it("recognizes Gaussian splats and does not load them", () => {
        const cases: [string, string, string][] = [
            ["splat", "points.splat", "splat"],
            ["spz", "points.spz", "spz"],
            ["sog", "points.sog", "sog"],
            ["ply-splat", "splat.ply", "splat-ply"],
            ["ply-splat-compressed", "splat.compressed.ply", "splat-ply"],
        ];
        for (const [id, name, format] of cases) {
            assert.deepStrictEqual(detectModelFormat({ filename: name, head: fixture(id, name) }), {
                format,
                supported: false,
            });
        }
        // An unbundled SOG's meta.json, and a splat named with no bytes to read.
        assert.deepStrictEqual(
            detectModelFormat({ filename: "meta.json", head: new TextEncoder().encode('{"means":{},"quats":{}}') }),
            { format: "sog", supported: false },
        );
        assert.deepStrictEqual(
            detectModelFormat({ filename: "a.sog", head: zipSync({ "meta.json": new Uint8Array(2) }) }),
            { format: "sog", supported: false },
        );
        for (const ext of ["splat", "spz", "sog"]) {
            assert.deepStrictEqual(detectModelFormat({ filename: `a.${ext}` }), { format: ext, supported: false });
        }
        // A head too short to hold the whole header is a PLY until the intake reads all of it.
        const head = fixture("ply-splat", "splat.ply").slice(0, 20);
        assert.deepStrictEqual(detectModelFormat({ filename: "splat.ply", head }), { format: "ply", supported: true });
        assert.notInclude(BUILT_IN_MODEL_FORMATS as readonly string[], "splat");
        // A plain PLY point cloud is still a PLY.
        assert.deepStrictEqual(detectModelFormat({ head: fixture("ply-points-bin", "points.ply") }), {
            format: "ply",
            supported: true,
        });
    });

    it("has a reader for every format intake accepts", () => {
        for (const format of BUILT_IN_MODEL_FORMATS) {
            assert.isTrue(hasReader(format), format);
        }
        assert.isTrue(hasReader("fbx"));
        assert.isFalse(hasReader("dae"));
    });
});

describe("the STL reader", () => {
    it("reads VisCAM and Materialise face colors as red", () => {
        for (const id of ["stl-binary-colored", "stl-binary-materialise"]) {
            const bytes = fixture(id, "cube.stl");
            assert.deepStrictEqual(stlFacts(bytes), { encoding: "binary", triangles: 12, vertexColors: true });
            const { colors } = readStl(bytes);
            assert.deepStrictEqual([...(colors ?? []).slice(0, 4)], [1, 0, 0, 1], id);
        }
    });

    it("reads an unnamed solid with another name on endsolid, and leaves normals to the winding", () => {
        const geometry = readStl(fixture("stl-ascii-unnamed", "cube.stl"));
        assert.strictEqual(geometry.indices.length, 36);
        assert.isUndefined(geometry.normals);
        assert.strictEqual(stlFacts(fixture("stl-binary", "cube.stl")).vertexColors, false);
    });
});

describe("the PLY reader", () => {
    it("reads the same cube from ASCII, little-endian and big-endian bodies", () => {
        const [ascii, le, be] = ["ply-ascii", "ply-le", "ply-be"].map(
            (id) => readPly(fixture(id, "cube.ply")).geometry,
        );
        assert.deepStrictEqual([...le.positions], [...ascii.positions]);
        assert.deepStrictEqual([...be.positions], [...ascii.positions]);
        assert.deepStrictEqual([...be.indices], [...ascii.indices]);
    });

    it("fans quads into triangles, reads colors and texture coordinates and the texture it names", () => {
        assert.strictEqual(readPly(fixture("ply-quads", "cube.ply")).geometry.indices.length, 36);
        assert.deepStrictEqual(
            [...(readPly(fixture("ply-ascii-colors", "cube.ply")).geometry.colors ?? []).slice(0, 4)],
            [1, 0, 0, 1],
        );
        const textured = readPly(fixture("ply-uv-png", "cube.ply"));
        assert.strictEqual(textured.textureFile, "cube.png");
        assert.strictEqual(textured.geometry.uvs?.length, 48);
    });

    it("draws points as octahedra, eight triangles each", () => {
        const points = readPly(fixture("ply-points-bin", "points.ply"));
        assert.strictEqual(points.kind, "points");
        assert.strictEqual(points.drawn, 216);
        assert.strictEqual(points.geometry.indices.length, 216 * 24);
    });

    it("refuses a face that names a vertex the file does not have", () => {
        assert.strictEqual(
            ruleOf(() => readPly(fixture("ply-damaged", "cube.ply"))),
            "ply",
        );
        assert.strictEqual(
            ruleOf(() => readPly(new TextEncoder().encode("ply\nformat ascii 1.0\n"))),
            "header",
        );
    });
});

describe("points as solids", () => {
    it("thins points by stride to the cap", () => {
        const many = new Float32Array((MAX_POINTS_DRAWN + 10) * 3);
        assert.strictEqual(pointsToSolids(many).drawn, MAX_POINTS_DRAWN);
    });
});

describe("glTF 1.0", () => {
    it("upgrades a GLB version 1 and a .gltf 1.0 to glTF 2.0 that passes every check", () => {
        const { text, body } = readGlb1(fixture("glb1", "cube.glb"));
        const json = parseGltfJson(text);
        assert.isTrue(isGltf1(json));
        const upgraded = upgradeGltf1(json);
        const files = new Map<string, Uint8Array>();
        const checked = checkGltf({
            json: upgraded,
            bin: body,
            path: "cube.glb",
            files,
            limits: DEFAULT_MODEL_LIMITS,
            format: "glb",
            upgraded: true,
        });
        assert.strictEqual(checked.summary.triangles, 12);
        assert.strictEqual(checked.summary.gltfVersion, "1.0");
        assert.deepStrictEqual((upgraded.materials as { pbrMetallicRoughness: unknown }[])[0].pbrMetallicRoughness, {
            metallicFactor: 0,
            roughnessFactor: 1,
            baseColorFactor: [0, 0, 1, 1],
        });
        assert.notProperty(upgraded, "techniques");
        assert.notProperty(upgraded, "shaders");
    });

    it("keeps skins, merges animations into one clip, folds the bind shape matrix in, and keeps only a COLOR the technique reads", () => {
        // Two joints' inverse bind matrices: identity, and a translation by (1, 2, 3).
        const ibm = new Float32Array([
            1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1,
        ]);
        const accessor = (bufferView: string, type: string): Record<string, unknown> => ({
            bufferView,
            componentType: 5126,
            count: 2,
            type,
        });
        const json = {
            asset: { version: "1.0" },
            buffers: { b: { byteLength: 128, uri: "b.bin" } },
            bufferViews: { v: { buffer: "b", byteOffset: 0, byteLength: 128 } },
            accessors: {
                pos: accessor("v", "VEC3"),
                color: accessor("v", "VEC4"),
                ibm: accessor("v", "MAT4"),
                time: accessor("v", "SCALAR"),
                rot: accessor("v", "VEC4"),
            },
            techniques: {
                plain: { attributes: { aPosition: "position" }, parameters: { position: { semantic: "POSITION" } } },
            },
            materials: { m: { technique: "plain" } },
            meshes: {
                mesh: {
                    primitives: [
                        {
                            attributes: { POSITION: "pos", COLOR: "color", JOINT: "pos", WEIGHT: "color" },
                            material: "m",
                        },
                    ],
                },
            },
            skins: {
                s: {
                    bindShapeMatrix: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
                    inverseBindMatrices: "ibm",
                    jointNames: ["hip", "knee"],
                },
            },
            nodes: {
                body: { meshes: ["mesh"], skin: "s", skeletons: ["root"] },
                root: { jointName: "hip", children: ["leg"] },
                leg: { jointName: "knee" },
            },
            animations: {
                walk: {
                    channels: [{ sampler: "spin", target: { id: "leg", path: "rotation" } }],
                    parameters: { TIME: "time", rotation: "rot" },
                    samplers: { spin: { input: "TIME", output: "rotation", interpolation: "LINEAR" } },
                },
            },
            scenes: { main: { nodes: ["body", "root"] } },
            scene: "main",
        };
        const upgraded = upgradeGltf1(json, undefined, () => new Uint8Array(ibm.buffer));
        const { attributes } = (upgraded.meshes as { primitives: { attributes: Record<string, number> }[] }[])[0]
            .primitives[0];
        assert.deepStrictEqual(Object.keys(attributes).sort(), ["JOINTS_0", "POSITION", "WEIGHTS_0"]);
        const skin = (upgraded.skins as Record<string, unknown>[])[0];
        assert.deepStrictEqual(skin.joints, [1, 2]);
        assert.strictEqual(skin.skeleton, 1);
        assert.strictEqual((upgraded.nodes as Record<string, unknown>[])[0].skin, 0);
        assert.deepStrictEqual(upgraded.animations, [
            {
                samplers: [{ input: 3, output: 4, interpolation: "LINEAR" }],
                channels: [{ sampler: 0, target: { node: 2, path: "rotation" } }],
            },
        ]);
        // The clip's length is read from its input's range, which glTF 1.0 left out.
        assert.deepStrictEqual((upgraded.accessors as Record<string, unknown>[])[3].max, [1]);
        // The folded matrices (IBM * BSM) are in a buffer of their own.
        const folded = (upgraded.accessors as Record<string, unknown>[])[skin.inverseBindMatrices as number];
        const { buffer } = (upgraded.bufferViews as Record<string, number>[])[folded.bufferView as number];
        const { uri } = (upgraded.buffers as { uri: string }[])[buffer];
        const bytes = Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (c) => c.codePointAt(0) ?? 0);
        assert.deepStrictEqual(
            [...new Float32Array(bytes.buffer)],
            [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 2, 3, 1],
        );

        // A technique that reads COLOR keeps it.
        json.techniques.plain.attributes = { aPosition: "position", aColor: "color" } as never;
        (json.techniques.plain.parameters as Record<string, unknown>).color = { semantic: "COLOR" };
        const colored = upgradeGltf1(json);
        assert.property(
            (colored.meshes as { primitives: { attributes: object }[] }[])[0].primitives[0].attributes,
            "COLOR_0",
        );
    });
});

describe("the .babylon reader", () => {
    it("refuses meshes that load from other files and indices out of range", () => {
        assert.strictEqual(
            ruleOf(() => readBabylon({ meshes: [{ delayLoadingFile: "x.babylonmeshdata" }] })),
            "delayLoad",
        );
        assert.strictEqual(
            ruleOf(() => readBabylon({ meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 7] }] })),
            "babylon",
        );
    });
});

describe("the .babylon reader, field by field", () => {
    it("reads shared geometry, colors, normals, uvs, materials, parents and transforms", () => {
        const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0];
        const scene = readBabylon({
            materials: [
                { id: "red", diffuse: [1, 0, 0], alpha: 0.5, diffuseTexture: { name: "wood.png" } },
                { diffuse: [1, 2] },
                "not a material",
            ],
            geometries: { vertexData: [{ id: "g", positions: tri, colors: [1, 0, 0, 0, 1, 0, 0, 0, 1] }, 7] },
            meshes: [
                { id: "root", name: "root" },
                {
                    id: "child",
                    parentId: "root",
                    geometryId: "g",
                    materialId: "red",
                    position: [1, 2, 3],
                    rotation: [0, 1, 0],
                    rotationQuaternion: [0, 0, 0, 1],
                    scaling: [2, 2, 2],
                },
                {
                    positions: tri,
                    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
                    uvs: [0, 0, 1, 0, 0, 1],
                    colors: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                    parentId: "missing",
                    scaling: [1, 1],
                },
                { positions: tri, indices: [0, 1, 2], colors: [1, 2] },
            ],
        });
        assert.deepStrictEqual(scene.materials[0], { color: [1, 0, 0], texture: "wood.png", alpha: 0.5 });
        assert.deepStrictEqual(scene.materials[1], {});
        const [root, child, plain, odd] = scene.meshes;
        assert.strictEqual(root.geometry.positions.length, 0);
        assert.strictEqual(child.parent, 0);
        assert.strictEqual(child.material, 0);
        assert.deepStrictEqual(child.position, [1, 2, 3]);
        assert.deepStrictEqual(child.rotationQuaternion, [0, 0, 0, 1]);
        assert.strictEqual(child.geometry.colors?.length, 12);
        assert.strictEqual(plain.name, "mesh 2");
        assert.isUndefined(plain.parent);
        assert.isUndefined(plain.scaling);
        assert.strictEqual(plain.geometry.normals?.length, 9);
        assert.strictEqual(plain.geometry.uvs?.length, 6);
        assert.strictEqual(plain.geometry.colors?.length, 12);
        assert.isUndefined(odd.geometry.colors);
    });
});

describe("picture sizes", () => {
    it("reads KTX2, AVIF, BMP, GIF, DDS and TGA headers", () => {
        assert.deepStrictEqual(imageSize(fixture("gltf-avif", "cube.avif")), { width: 8, height: 8 });
        for (const ext of ["bmp", "gif", "dds", "tga"]) {
            assert.deepStrictEqual(imageSize(fixture(`obj-mtl-${ext}`, `cube.${ext}`)), { width: 8, height: 8 }, ext);
        }
        const ktx2 = imageSize(fixture("gltf-ktx2", "cube.ktx2"));
        assert.isAbove(ktx2?.width ?? 0, 0);
    });

    it("counts a KTX2 picture at 1 byte a pixel and others at 4, with mipmaps", () => {
        const ktx2 = fixture("gltf-ktx2", "cube.ktx2");
        const { width, height } = imageSize(ktx2) ?? { width: 0, height: 0 };
        assert.strictEqual(textureBytesOf(ktx2, "ktx2"), Math.ceil((width * height * 4) / 3));
        const webp = fixture("gltf-transmission-required", "base.webp");
        assert.strictEqual(textureBytesOf(webp, "base.webp"), Math.ceil((2048 * 2048 * 4 * 4) / 3));
    });
});

describe("the transmission family", () => {
    it("is drawn without: a glTF requiring it is accepted with W_MODEL_EXTENSION_IGNORED", () => {
        const json = parseGltfJson(new TextDecoder().decode(fixture("gltf-transmission-required", "cube.gltf")));
        const buffers = new Map([["cube.bin", fixture("gltf-transmission-required", "cube.bin")]]);
        const images = new Map(
            ["base.webp", "orm.webp", "normal.webp"].map((name) => [name, fixture("gltf-transmission-required", name)]),
        );
        const { warnings } = checkGltf({
            json,
            path: "cube.gltf",
            format: "gltf",
            limits: DEFAULT_MODEL_LIMITS,
            files: new Map([...buffers, ...images]),
        });
        assert.deepInclude(warnings, {
            code: "W_MODEL_EXTENSION_IGNORED",
            params: { extension: "KHR_materials_transmission" },
        });
    });
});
