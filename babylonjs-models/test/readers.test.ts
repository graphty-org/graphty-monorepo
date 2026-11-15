/**
 * The readers and checks of every format babylonjs-models reads, over the variant fixtures
 * (test/fixtures/variants, written by its generate.ts): detection, the STL, PLY and .babylon
 * readers, points and splats drawn as solids, the glTF 1.0 upgrade and picture sizes.
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
import { MAX_POINTS_DRAWN, ModelReadError, pointsToSolids, splatRowsToSolids } from "../src/files/readers/geometry.js";
import { isGltf1, readGlb1, upgradeGltf1 } from "../src/files/readers/gltf1.js";
import { readPly } from "../src/files/readers/ply.js";
import { readStl, stlFacts } from "../src/files/readers/stl.js";
import { imageSize } from "../src/files/references.js";
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
    it("reads glTF 1.0, splats, .babylon and SOG, and names BVH", () => {
        assert.deepStrictEqual(detectModelFormat({ head: fixture("glb1", "cube.glb") }), {
            format: "glb",
            supported: true,
        });
        assert.deepStrictEqual(detectModelFormat({ filename: "a.spz", head: fixture("spz", "combined_SPZv3.spz") }), {
            format: "spz",
            supported: true,
        });
        assert.deepStrictEqual(
            detectModelFormat({ filename: "a.sog", head: zipSync({ "meta.json": new Uint8Array(2) }) }),
            {
                format: "sog",
                supported: true,
            },
        );
        assert.deepStrictEqual(
            detectModelFormat({ filename: "meta.json", head: new TextEncoder().encode('{"means":{},"quats":{}}') }),
            { format: "sog", supported: true },
        );
        assert.deepStrictEqual(
            detectModelFormat({ filename: "cube.babylon", head: fixture("babylon", "cube.babylon") }),
            {
                format: "babylon",
                supported: true,
            },
        );
        assert.deepStrictEqual(detectModelFormat({ head: fixture("bvh", "walk.bvh") }), {
            format: "bvh",
            supported: false,
        });
    });

    it("has a reader for every format intake accepts", () => {
        for (const format of BUILT_IN_MODEL_FORMATS) {
            assert.isTrue(hasReader(format), format);
        }
        assert.isFalse(hasReader("fbx"));
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

    it("draws points and splats as octahedra, eight triangles each", () => {
        const points = readPly(fixture("ply-points-bin", "points.ply"));
        assert.strictEqual(points.kind, "points");
        assert.strictEqual(points.drawn, 216);
        assert.strictEqual(points.geometry.indices.length, 216 * 24);
        const splat = readPly(fixture("ply-splat", "splat.ply"));
        assert.strictEqual(splat.kind, "splats");
        assert.strictEqual(splat.drawn, 216);
        const compressed = readPly(fixture("ply-splat-compressed", "combined_SPZv3.compressed.ply"));
        assert.strictEqual(compressed.kind, "splats");
        assert.isAbove(compressed.drawn ?? 0, 0);
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

    it("drops splats whose opacity is under 0.1", () => {
        const rows = new Uint8Array(fixture("splat", "points.splat"));
        rows[27] = 10;
        assert.strictEqual(splatRowsToSolids(rows.slice().buffer).drawn, 215);
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

describe("picture sizes", () => {
    it("reads KTX2, AVIF, BMP, GIF, DDS and TGA headers", () => {
        assert.deepStrictEqual(imageSize(fixture("gltf-avif", "cube.avif")), { width: 8, height: 8 });
        for (const ext of ["bmp", "gif", "dds", "tga"]) {
            assert.deepStrictEqual(imageSize(fixture(`obj-mtl-${ext}`, `cube.${ext}`)), { width: 8, height: 8 }, ext);
        }
        const ktx2 = imageSize(fixture("gltf-ktx2", "cube.ktx2"));
        assert.isAbove(ktx2?.width ?? 0, 0);
    });
});
