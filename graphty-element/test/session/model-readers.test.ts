/**
 * graphty-element's own model readers (src/models/readers/) and the intake facts around them:
 * detection of the new formats, STL colors, every PLY encoding, points and splats as solids,
 * glTF 1.0 upgraded and checked, `.babylon` refusals, picture sizes, the decoder index checks,
 * and a reader for every format intake accepts.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { BUILT_IN_MODEL_FORMATS, detectModelFormat } from "../../src/catalog/detectModel";
import { hasReader } from "../../src/models/loadModel";
import { readBabylon } from "../../src/models/readers/babylon";
import { MAX_POINTS_DRAWN, ModelReadError, pointsToSolids, splatRowsToSolids } from "../../src/models/readers/geometry";
import { isGltf1, readGlb1, upgradeGltf1 } from "../../src/models/readers/gltf1";
import { readPly } from "../../src/models/readers/ply";
import { readStl, stlFacts } from "../../src/models/readers/stl";
import { createAssetsApi, DEFAULT_MODEL_LIMITS } from "../../src/session/assets/AssetsApi";
import { checkGltf, parseGltfJson } from "../../src/session/assets/gltfChecks";
import { imageSize } from "../../src/session/assets/references";
import { zip } from "../fixtures/models/fixtures";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/models/variants");

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

describe("detecting the formats graphty-element reads", () => {
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
            detectModelFormat({ filename: "a.sog", head: zip({ "meta.json": new Uint8Array(2) }) }),
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

    it("is refused on intake with E_MODEL_STRUCTURE", async () => {
        const bytes = new TextEncoder().encode(JSON.stringify({ producer: {}, meshes: [{ delayLoadingFile: "a" }] }));
        const record = await createAssetsApi().add({ files: new Map([["cube.babylon", bytes]]) });
        assert.deepStrictEqual(record.problems[0], { code: "E_MODEL_STRUCTURE", params: { rule: "delayLoad" } });
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

describe("decoder index checks", () => {
    /**
     * The meshopt fixture with one change.
     * @param change - Edits the JSON.
     * @returns The rejection's first problem.
     */
    async function meshoptWith(change: (json: Record<string, unknown>) => void): Promise<unknown> {
        const json = JSON.parse(new TextDecoder().decode(fixture("gltf-meshopt-ext", "cube.gltf"))) as Record<
            string,
            unknown
        >;
        change(json);
        const files = new Map([
            ["cube.gltf", new TextEncoder().encode(JSON.stringify(json))],
            ["cube.bin", fixture("gltf-meshopt-ext", "cube.bin")],
        ]);
        return (await createAssetsApi().add({ files })).problems[0];
    }

    it("refuses a meshopt source past its buffer, or decoding past its view", async () => {
        type View = { extensions: { EXT_meshopt_compression: Record<string, number> } };
        const past = await meshoptWith((json) => {
            (json.bufferViews as View[])[0].extensions.EXT_meshopt_compression.byteLength = 1_000_000;
        });
        assert.deepStrictEqual(past, { code: "E_MODEL_STRUCTURE", params: { rule: "accessor", where: "meshopt" } });
        const bomb = await meshoptWith((json) => {
            (json.bufferViews as View[])[0].extensions.EXT_meshopt_compression.count = 1_000_000_000;
        });
        assert.deepStrictEqual(bomb, { code: "E_MODEL_STRUCTURE", params: { rule: "accessor", where: "meshopt" } });
    });

    it("refuses a Draco buffer view out of range", async () => {
        const json = JSON.parse(new TextDecoder().decode(fixture("gltf-draco", "cube.gltf"))) as {
            meshes: { primitives: { extensions: { KHR_draco_mesh_compression: { bufferView: number } } }[] }[];
        };
        json.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression.bufferView = 99;
        const files = new Map([
            ["cube.gltf", new TextEncoder().encode(JSON.stringify(json))],
            ["cube.bin", fixture("gltf-draco", "cube.bin")],
        ]);
        const record = await createAssetsApi().add({ files });
        assert.deepStrictEqual(record.problems[0], {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "index", where: "draco.bufferView" },
        });
    });

    it("refuses an .spz that is not gzip of an NGSP header", async () => {
        const record = await createAssetsApi().add({
            files: new Map([["bad.spz", Uint8Array.from([0x1f, 0x8b, 0, 0])]]),
        });
        assert.deepStrictEqual(record.problems[0], { code: "E_MODEL_STRUCTURE", params: { rule: "splat" } });
    });
});
