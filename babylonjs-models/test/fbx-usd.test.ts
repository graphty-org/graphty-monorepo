/**
 * The checks of FBX (binary and ASCII) and USD (`.usda`, `.usdc`, a USDZ package, a stage of
 * several layers): detection, the summary each gives, the parts each names, and the refusal of a
 * damaged or oversized file before Babylon.js reads it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { zipSync } from "fflate";
import { assert, describe, it } from "vitest";

import {
    assetFileExtensions,
    BUILT_IN_MODEL_FORMATS,
    checkModelFiles,
    DEFAULT_MODEL_LIMITS,
    detectModelFormat,
    listModels,
    listParts,
    type ModelLimits,
    readModelFiles,
    unpackZip,
} from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A variant's files, by path.
 * @param id - The variant.
 * @param names - Its files.
 * @returns The set.
 */
function set(id: string, ...names: string[]): Map<string, Uint8Array> {
    return new Map(names.map((name) => [name, new Uint8Array(readFileSync(join(VARIANTS, id, name)))]));
}

/**
 * What checking a set threw.
 * @param files - The set.
 * @param limits - The limits.
 * @returns The fact.
 */
async function refusalOf(files: ReadonlyMap<string, Uint8Array>, limits: Partial<ModelLimits> = {}) {
    const error = await checkModelFiles(files, {}, { ...DEFAULT_MODEL_LIMITS, ...limits }).then(
        () => assert.fail("the set was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error.fact;
}

/**
 * Check a set.
 * @param files - The set.
 * @returns The checked model.
 */
function check(files: ReadonlyMap<string, Uint8Array>) {
    return checkModelFiles(files, {}, DEFAULT_MODEL_LIMITS);
}

describe("FBX and USD detection", () => {
    it("tells each by its bytes, and by its extension alone", () => {
        const cases: [string, string, string][] = [
            ["fbx", "cube.fbx", "fbx"],
            ["fbx-ascii", "cube.fbx", "fbx"],
            ["usda", "cube.usda", "usd"],
            ["usdc", "cube.usdc", "usd"],
            ["usdz", "cube.usdz", "usdz"],
        ];
        for (const [id, name, format] of cases) {
            const [head] = set(id, name).values();
            assert.deepStrictEqual(detectModelFormat({ filename: name, head }), { format, supported: true }, id);
            // A head with no name: a USDZ is a zip whose first entry is a USD layer.
            assert.deepStrictEqual(detectModelFormat({ head }), { format, supported: true }, `${id} by bytes`);
        }
        for (const [ext, format] of [
            ["fbx", "fbx"],
            ["usd", "usd"],
            ["usda", "usd"],
            ["usdc", "usd"],
            ["usdz", "usdz"],
        ]) {
            assert.deepStrictEqual(detectModelFormat({ filename: `a.${ext}` }), { format, supported: true });
            assert.include(assetFileExtensions("model"), `.${ext}`);
            assert.include(assetFileExtensions("model", { parts: false }), `.${ext}`);
        }
        for (const format of ["fbx", "usd", "usdz"]) {
            assert.include(BUILT_IN_MODEL_FORMATS as readonly string[], format);
        }
        // A zip of other things stays a zip.
        const zip = zipSync({ "readme.txt": new TextEncoder().encode("hi") }, { level: 0 });
        assert.deepStrictEqual(detectModelFormat({ head: zip }), { format: "zip", supported: true });
    });
});

describe("the FBX checks", () => {
    it("summarize a binary and an ASCII file alike", async () => {
        for (const id of ["fbx", "fbx-ascii"]) {
            const { summary, format } = await check(set(id, "cube.fbx"));
            assert.strictEqual(format, "fbx");
            assert.include(summary, { triangles: 12, meshes: 1, textures: 0, upAxis: "y", metersPerUnit: 0.01 });
            assert.strictEqual(summary.encoding, id === "fbx" ? "binary" : "ascii");
            assert.deepStrictEqual(summary.materials, ["Look"]);
            assert.deepStrictEqual(summary.bounds, { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] });
        }
    });

    it("count clips, skins, blend shapes and vertex colors", async () => {
        const spin = (await check(set("fbx-animated", "cube.fbx"))).summary;
        assert.deepStrictEqual(spin.animations, [{ name: "spin", seconds: 1 }]);
        const turn = (await check(set("fbx-skinned-animated", "cube.fbx"))).summary;
        assert.isTrue(turn.skinned);
        assert.deepStrictEqual(turn.animations, [{ name: "turn", seconds: 1 }]);
        const grow = (await check(set("fbx-morph-animated", "cube.fbx"))).summary;
        assert.strictEqual(grow.morphTargets, 1);
        assert.isTrue((await check(set("fbx-vertex-colors", "cube.fbx"))).summary.vertexColors);
    });

    it("name an external picture as a part, and an embedded one by its file name", async () => {
        const files = set("fbx-textured", "cube.fbx", "textures/cube.png");
        assert.deepStrictEqual((await check(files)).summary.pictures, [
            { name: "textures/cube.png", materials: ["Look"] },
        ]);
        const parts = listParts(files, {}, DEFAULT_MODEL_LIMITS) ?? [];
        assert.deepInclude(parts, {
            name: "textures/cube.png",
            role: "texture",
            state: "found",
            file: "textures/cube.png",
        });
        // Without the picture, the model waits for it.
        const fact = await refusalOf(set("fbx-textured", "cube.fbx"));
        assert.deepInclude(fact, { code: "E_MODEL_MISSING_FILE" });
        assert.strictEqual(fact.params.name, "textures/cube.png");
        // The picture beside the file, without its folder, is found by its base name.
        const flat = new Map([
            ...set("fbx-textured", "cube.fbx"),
            ["cube.png", set("fbx-textured", "textures/cube.png").get("textures/cube.png") as Uint8Array],
        ]);
        assert.strictEqual((await check(flat)).summary.textures, 1);

        for (const id of ["fbx-embedded-texture", "fbx-ascii-embedded-texture"]) {
            const { summary } = await check(set(id, "cube.fbx"));
            assert.deepStrictEqual(summary.pictures, [{ name: "cube.png", materials: ["Look"] }], id);
            assert.isAbove(summary.textureBytes, 0, id);
        }
    });

    it("hold a file to the limits", async () => {
        const files = set("fbx", "cube.fbx");
        assert.include(await refusalOf(files, { maxTriangles: 11 }), { code: "E_MODEL_TOO_LARGE" });
        assert.deepInclude(await refusalOf(files, { maxMaterials: 0 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "count", item: "materials", found: 1, limit: 0 },
        });
        assert.deepInclude(await refusalOf(set("fbx-animated", "cube.fbx"), { maxAnimations: 0 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "count", item: "animations", found: 1, limit: 0 },
        });
        // Deflated arrays decode past the budget: refused before they are inflated.
        assert.deepInclude(await refusalOf(files, { maxDecodedBytes: 100 }), { code: "E_MODEL_TOO_LARGE" });
    });

    it("refuse a damaged file", async () => {
        const [bytes] = set("fbx", "cube.fbx").values();
        // Cut short: a record runs past the end of the file.
        assert.deepStrictEqual(await refusalOf(new Map([["cube.fbx", bytes.slice(0, 200)]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "fbx" },
        });
        // A record whose end lies before its start.
        const bent = bytes.slice();
        new DataView(bent.buffer).setUint32(27, 5, true);
        assert.deepStrictEqual(await refusalOf(new Map([["cube.fbx", bent]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "fbx" },
        });
        // An ASCII polygon naming a vertex the mesh does not have.
        const [ascii] = set("fbx-ascii", "cube.fbx").values();
        const text = new TextDecoder().decode(ascii).replace("a: 0,1,2,-4", "a: 0,1,99,-4");
        assert.deepStrictEqual(await refusalOf(new Map([["cube.fbx", new TextEncoder().encode(text)]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "index", where: "fbx.PolygonVertexIndex" },
        });
        // An unclosed brace.
        assert.deepStrictEqual(
            await refusalOf(
                new Map([["cube.fbx", new TextEncoder().encode("; FBX 7.4.0 project file\nObjects: {\n")]]),
            ),
            { code: "E_MODEL_STRUCTURE", params: { rule: "fbx" } },
        );
    });

    it("never inflates a deflated array past the size it declares", async () => {
        // A binary file of one record whose array says 3 doubles but deflates to a megabyte.
        const bomb = deflateSync(Buffer.alloc(1 << 20));
        const name = Buffer.from("Vertices");
        const value = Buffer.concat([Buffer.from("d"), Buffer.alloc(12)]);
        value.writeUInt32LE(3, 1);
        value.writeUInt32LE(1, 5);
        value.writeUInt32LE(bomb.length, 9);
        const head = Buffer.alloc(13);
        const end = 27 + 13 + name.length + value.length + bomb.length;
        head.writeUInt32LE(end, 0);
        head.writeUInt32LE(1, 4);
        head.writeUInt32LE(value.length + bomb.length, 8);
        head.writeUInt8(name.length, 12);
        const file = Buffer.concat([
            Buffer.from("Kaydara FBX Binary  \0\u001a\0", "latin1"),
            Buffer.from([0xe8, 0x1c, 0, 0]),
            head,
            name,
            value,
            bomb,
            Buffer.alloc(13),
        ]);
        const { summary } = await check(new Map([["bomb.fbx", new Uint8Array(file)]]));
        assert.strictEqual(summary.triangles, 0);
    });
});

describe("the USD checks", () => {
    it("summarize a text layer, a binary layer and a package alike", async () => {
        for (const [id, name, format] of [
            ["usda", "cube.usda", "usd"],
            ["usdc", "cube.usdc", "usd"],
            ["usdz", "cube.usdz", "usdz"],
        ]) {
            const checked = await check(set(id, name));
            assert.strictEqual(checked.format, format, id);
            assert.include(checked.summary, { triangles: 12, meshes: 1, upAxis: "y", metersPerUnit: 1 }, id);
            assert.deepStrictEqual(checked.summary.materials, ["Look"], id);
            assert.deepStrictEqual(checked.summary.bounds, { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }, id);
        }
        assert.strictEqual((await check(set("usda", "cube.usda"))).summary.encoding, "ascii");
        assert.strictEqual((await check(set("usdc", "cube.usdc"))).summary.encoding, "binary");
        // A package's picture is named by its path inside the package.
        assert.deepStrictEqual((await check(set("usdz", "cube.usdz"))).summary.pictures, [
            { name: "0/cube.png", materials: ["Look"] },
        ]);
    });

    it("count a stage's clip and skeleton", async () => {
        const spin = (await check(set("usda-animated", "cube.usda"))).summary;
        assert.deepStrictEqual(spin.animations, [{ name: "USD Animation 1", seconds: 1 }]);
        const skinned = (await check(set("usdz-skinned-animated", "cube.usdz"))).summary;
        assert.isTrue(skinned.skinned);
        assert.strictEqual(skinned.animations.length, 1);
    });

    it("find a stage's layers and pictures as its parts, from the layer that names each", async () => {
        const files = set("usd-layers", "cube.usda", "geo/cube.usdc", "textures/cube.png");
        const checked = await check(files);
        assert.strictEqual(checked.main, "cube.usda", "the root layer, not the layer it references");
        assert.deepStrictEqual(checked.summary.pictures, [{ name: "textures/cube.png", materials: ["Look"] }]);
        assert.strictEqual(checked.summary.triangles, 12);
        const parts = listParts(files, {}, DEFAULT_MODEL_LIMITS) ?? [];
        assert.deepInclude(parts, { name: "geo/cube.usdc", role: "geometry", state: "found", file: "geo/cube.usdc" });
        assert.deepInclude(parts, {
            name: "textures/cube.png",
            role: "texture",
            state: "found",
            file: "textures/cube.png",
        });
        assert.deepStrictEqual(
            listModels(files, DEFAULT_MODEL_LIMITS).map((m) => m.main),
            ["cube.usda"],
            "a referenced layer is a part, not a model of its own",
        );
        // A referenced layer missing is a required part; a picture an optional one.
        const noGeo = set("usd-layers", "cube.usda", "textures/cube.png");
        assert.deepInclude(await refusalOf(noGeo), {
            code: "E_MODEL_MISSING_FILE",
            params: { name: "geo/cube.usdc", referencedBy: "cube.usda", role: "geometry", optional: false },
        });
        const noPicture = set("usd-layers", "cube.usda", "geo/cube.usdc");
        assert.deepInclude(await refusalOf(noPicture), {
            code: "E_MODEL_MISSING_FILE",
            params: { name: "textures/cube.png", referencedBy: "geo/cube.usdc", role: "texture", optional: true },
        });
    });

    it("hold a stage to the limits", async () => {
        assert.include(await refusalOf(set("usdc", "cube.usdc"), { maxTriangles: 11 }), { code: "E_MODEL_TOO_LARGE" });
        assert.include(await refusalOf(set("usdz", "cube.usdz"), { maxTextureBytes: 10 }), {
            code: "E_MODEL_TOO_LARGE",
        });
        // A binary layer whose sections decompress past the budget.
        assert.deepStrictEqual(await refusalOf(set("usdc", "cube.usdc"), { maxDecodedBytes: 16 }), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "usd" },
        });
    });

    it("refuse a damaged layer or package", async () => {
        const [crate] = set("usdc", "cube.usdc").values();
        for (const cut of [40, crate.length - 40]) {
            assert.deepStrictEqual(await refusalOf(new Map([["cube.usdc", crate.slice(0, cut)]])), {
                code: "E_MODEL_STRUCTURE",
                params: { rule: "usd" },
            });
        }
        // A table of contents that points past the end.
        const bent = crate.slice();
        new DataView(bent.buffer).setBigUint64(16, 1n << 40n, true);
        assert.deepStrictEqual(await refusalOf(new Map([["cube.usdc", bent]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "usd" },
        });
        // USDZ stores its files as they are: a compressed entry is refused, not inflated.
        const squeezed = zipSync(
            { "cube.usda": set("usda", "cube.usda").get("cube.usda") as Uint8Array },
            { level: 9 },
        );
        assert.deepStrictEqual(await refusalOf(new Map([["cube.usdz", squeezed]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "usdz" },
        });
        // A package whose first entry is not a layer.
        const picture = zipSync({ "cube.png": new Uint8Array(8) }, { level: 0 });
        assert.deepStrictEqual(await refusalOf(new Map([["cube.usdz", picture]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "usdz" },
        });
        // Text that is not a USD layer.
        assert.deepStrictEqual(await refusalOf(new Map([["cube.usda", new TextEncoder().encode("hello")]]), {}), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "usd" },
        });
    });
});

describe("the BVH checks", () => {
    it("summarize the figure a motion capture file is drawn as", async () => {
        const [head] = set("bvh", "walk.bvh").values();
        assert.deepStrictEqual(detectModelFormat({ head }), { format: "bvh", supported: true });
        const { summary, warnings } = await check(set("bvh", "walk.bvh"));
        // Four bones (hips to chest, chest to arm, arm to its end, chest to the head's end): a box each.
        assert.include(summary, { format: "bvh", triangles: 48, meshes: 1, skinned: true, encoding: "ascii" });
        assert.deepStrictEqual(summary.animations, [{ name: "BVH Animation", seconds: 1 }]);
        assert.deepStrictEqual(summary.bounds, { min: [0, 0, 0], max: [1.2, 1.5, 0] });
        assert.deepInclude(warnings, { code: "W_MODEL_HAS_ANIMATIONS", params: { clips: ["BVH Animation"] } });
    });

    it("refuse a file whose frames hold fewer numbers than its channels need, or too many joints", async () => {
        const [bytes] = set("bvh", "walk.bvh").values();
        const text = new TextDecoder().decode(bytes);
        const short = text.slice(0, text.lastIndexOf("90"));
        assert.deepStrictEqual(await refusalOf(new Map([["walk.bvh", new TextEncoder().encode(short)]])), {
            code: "E_MODEL_STRUCTURE",
            params: { rule: "bvh" },
        });
        assert.deepInclude(await refusalOf(set("bvh", "walk.bvh"), { maxJoints: 2 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "count", item: "joints", found: 5, limit: 2 },
        });
    });
});

describe("FBX, USD and USDZ in a zip", () => {
    it("are found and checked inside a .zip, a folder of layers and a .usdz alike", async () => {
        const unzipped = async (entries: Record<string, Uint8Array>) => {
            const { given } = await readModelFiles(
                { files: new Map([["kit.zip", zipSync(entries)]]) },
                DEFAULT_MODEL_LIMITS,
            );
            return await unpackZip(given, DEFAULT_MODEL_LIMITS);
        };
        const layers = Object.fromEntries(set("usd-layers", "cube.usda", "geo/cube.usdc", "textures/cube.png"));
        const stage = await check(await unzipped(layers));
        assert.strictEqual(stage.main, "cube.usda");
        assert.strictEqual(stage.summary.triangles, 12);
        // A .usdz inside a zip is a model of its own, not a nested zip.
        const usdz = await check(await unzipped(Object.fromEntries(set("usdz", "cube.usdz"))));
        assert.strictEqual(usdz.format, "usdz");
        const fbx = await check(
            await unzipped(Object.fromEntries(set("fbx-textured", "cube.fbx", "textures/cube.png"))),
        );
        assert.strictEqual(fbx.summary.textures, 1);
    });
});
