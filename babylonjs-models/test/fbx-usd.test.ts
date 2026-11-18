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
import { imageSize, ModelError } from "../src/files/references.js";

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

    it("say a layer's displayColor other than white is drawn as vertex colors, and an opacity below 1 is see-through", async () => {
        const text = new TextDecoder().decode(set("usda", "cube.usda").get("cube.usda"));
        const { summary: plain } = await check(set("usda", "cube.usda"));
        assert.isUndefined(plain.vertexColors);
        assert.isFalse(plain.transparent);
        const painted = text.replace(
            "uniform token subdivisionScheme",
            "color3f[] primvars:displayColor = [(0.8, 0.8, 0.8)]\n        float[] primvars:displayOpacity = [0.5]\n        uniform token subdivisionScheme",
        );
        assert.notStrictEqual(painted, text);
        const { summary } = await check(new Map([["cube.usda", new TextEncoder().encode(painted)]]));
        assert.isTrue(summary.vertexColors);
        assert.isTrue(summary.transparent);
        const white = text.replace(
            "uniform token subdivisionScheme",
            "color3f[] primvars:displayColor = [(1, 1, 1)]\n        uniform token subdivisionScheme",
        );
        const { summary: plainWhite } = await check(new Map([["cube.usda", new TextEncoder().encode(white)]]));
        assert.isUndefined(plainWhite.vertexColors, "white draws as no color");
        const glass = text.replace("float inputs:roughness = 0.8", "float inputs:opacity = 0.25");
        assert.isTrue((await check(new Map([["cube.usda", new TextEncoder().encode(glass)]]))).summary.transparent);
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

    it("count what a stage draws, per use: references, an instancer's instances, time samples, a package", async () => {
        // OpenUSD's own counts of each stage, traversed as it draws them (instance proxies, instancers).
        const drawn = async (main: string, ...names: string[]) => {
            const checked = await checkModelFiles(set("usd-composed", main, ...names), { main }, DEFAULT_MODEL_LIMITS);
            return [checked.summary.triangles, checked.summary.meshes];
        };
        for (const ext of ["usda", "usdc"]) {
            // Five internal references to a 12-triangle cube, beside the cube itself.
            assert.deepStrictEqual(await drawn(`internal.${ext}`), [72, 6], ext);
            // Four references to a cube in another layer.
            assert.deepStrictEqual(await drawn(`external.${ext}`, "geo.usdc"), [48, 4], ext);
            // Ten instances of a prototype under its instancer, which is drawn only as them.
            assert.deepStrictEqual(await drawn(`instancer.${ext}`), [120, 10], ext);
            // Faces written only as time samples.
            assert.deepStrictEqual(await drawn(`timesampled.${ext}`), [12, 1], ext);
        }
        // A cube in a package a layer references, beside it or inside an outer package.
        assert.deepStrictEqual(await drawn("nested.usda", "inner.usdz"), [12, 1]);
        assert.deepStrictEqual(await drawn("nested.usdz"), [12, 1]);
        // Given together with no main named, the layer is the model, not the package it references.
        assert.strictEqual((await check(set("usd-composed", "nested.usda", "inner.usdz"))).main, "nested.usda");
        assert.deepInclude(await refusalOf(set("usd-composed", "nested.usda")), {
            code: "E_MODEL_MISSING_FILE",
            params: { name: "inner.usdz", referencedBy: "nested.usda", role: "geometry", optional: false },
        });
    });

    it("hold a stage to the limits by what it draws, not what one layer writes", async () => {
        const text = (body: string) => new TextEncoder().encode(`#usda 1.0\n${body}`);
        const mesh = 'def Mesh "G"\n{\n int[] faceVertexCounts = [3, 3]\n}\n';
        // 2 triangles drawn 1 + 1000 times by internal references.
        let internal = mesh;
        for (let i = 0; i < 1000; i++) {
            internal += `def "C${String(i)}" ( references = </G> ) {}\n`;
        }
        // A point instancer of 1000 instances of the same mesh.
        const instancer = `${mesh}def PointInstancer "P"\n{\n rel prototypes = [</G>]\n int[] protoIndices = [${Array(1000).fill(0).join(",")}]\n}\n`;
        // 100 references to a layer that references that mesh's layer 100 times.
        const many = (to: string) =>
            Array.from({ length: 100 }, (_, i) => `def "C${String(i)}" ( references = @${to}@ ) {}\n`).join("");
        const nested = new Map([
            ["root.usda", text(many("./mid.usda"))],
            ["mid.usda", text(many("./geo.usda"))],
            ["geo.usda", text(mesh)],
        ]);
        // Faces written only as a time sample.
        const sampled = text(
            `def Mesh "M"\n{\n int[] faceVertexCounts.timeSamples = { 0: [${Array(1000).fill(3).join(",")}] }\n}\n`,
        );
        for (const [files, triangles] of [
            [new Map([["a.usda", text(internal)]]), 2002],
            [new Map([["a.usda", text(instancer)]]), 2002],
            [nested, 20000],
            [new Map([["a.usda", sampled]]), 1000],
        ] as const) {
            assert.deepInclude(await refusalOf(files, { maxTriangles: triangles - 1 }), {
                code: "E_MODEL_TOO_LARGE",
                params: { what: "triangles", found: triangles, limit: triangles - 1 },
            });
        }
        // A reference cycle is not followed for ever.
        const cycle = new Map([
            ["a.usda", text('def "A" ( references = </B> ) {}\ndef "B" ( references = </A> ) {}\n')],
        ]);
        assert.strictEqual((await check(cycle)).summary.triangles, 0);
    });

    it("size a stage as drawn: each use where its transforms and an instancer's positions put it", async () => {
        const size = async (main: string, ...names: string[]) => {
            const { bounds } = (
                await checkModelFiles(set("usd-composed", main, ...names), { main }, DEFAULT_MODEL_LIMITS)
            ).summary;
            return bounds === undefined ? undefined : [0, 1, 2].map((a) => bounds.max[a] - bounds.min[a]);
        };
        for (const ext of ["usda", "usdc"]) {
            // A unit cube and five copies 2 apart; four copies of one in another layer; ten instances 2 apart.
            assert.deepStrictEqual(await size(`internal.${ext}`), [11, 1, 1], ext);
            assert.deepStrictEqual(await size(`external.${ext}`, "geo.usdc"), [7, 1, 1], ext);
            assert.deepStrictEqual(await size(`instancer.${ext}`), [19, 1, 1], ext);
        }
        // Ten uses of a unit cube inside a package, 2 apart.
        assert.deepStrictEqual(await size("packaged.usda", "pkg.usdz"), [19, 1, 1]);

        // Scaled, turned, and moved by a matrix; a pivot undone by its inverse.
        const text = (body: string) => new TextEncoder().encode(`#usda 1.0\n${body}`);
        const square =
            'def Mesh "M"\n{\n int[] faceVertexCounts = [4]\n point3f[] points = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]\n';
        const cases: [string, number[]][] = [
            ['float3 xformOp:scale = (3, 2, 1)\n uniform token[] xformOpOrder = ["xformOp:scale"]', [3, 2, 0]],
            [
                'float xformOp:rotateZ = 45\n uniform token[] xformOpOrder = ["xformOp:rotateZ"]',
                [Math.SQRT2, Math.SQRT2, 0],
            ],
            [
                'matrix4d xformOp:transform = ( (2, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (5, 0, 0, 1) )\n uniform token[] xformOpOrder = ["xformOp:transform"]',
                [2, 1, 0],
            ],
            [
                'double3 xformOp:translate:pivot = (1, 0, 0)\n float xformOp:rotateZ = 90\n uniform token[] xformOpOrder = ["xformOp:translate:pivot", "xformOp:rotateZ", "!invert!xformOp:translate:pivot"]',
                [1, 1, 0],
            ],
            [
                'quatf xformOp:orient = (0.70710678, 0, 0, 0.70710678)\n float3 xformOp:scale = (3, 1, 1)\n uniform token[] xformOpOrder = ["xformOp:orient", "xformOp:scale"]',
                [1, 3, 0],
            ],
            [
                'float3 xformOp:rotateXYZ = (0, 0, 90)\n float3 xformOp:scale = (3, 1, 1)\n uniform token[] xformOpOrder = ["xformOp:rotateXYZ", "xformOp:scale"]',
                [1, 3, 0],
            ],
        ];
        for (const [ops, expected] of cases) {
            const { bounds } = (await check(new Map([["a.usda", text(`${square} ${ops}\n}\n`)]]))).summary;
            assert.isDefined(bounds);
            [0, 1, 2].forEach((a) => {
                assert.closeTo((bounds?.max[a] ?? 0) - (bounds?.min[a] ?? 0), expected[a], 1e-9, ops);
            });
        }
    });

    it("follow a package-relative asset path (@pkg.usdz[geo.usda]@) and count every use", async () => {
        const text = (body: string) => new TextEncoder().encode(`#usda 1.0\n${body}`);
        const geo = text('(\n defaultPrim = "G"\n)\ndef Mesh "G"\n{\n int[] faceVertexCounts = [3, 3]\n}\n');
        const refs = Array.from(
            { length: 10 },
            (_, i) => `def "C${String(i)}" ( references = @./pkg.usdz[geo.usda]@ ) {}\n`,
        ).join("");
        const files = new Map([
            ["root.usda", text(refs)],
            ["pkg.usdz", zipSync({ "geo.usda": [geo, { level: 0 }] })],
        ]);
        const checked = await checkModelFiles(files, { main: "root.usda" }, DEFAULT_MODEL_LIMITS);
        assert.deepStrictEqual([checked.summary.triangles, checked.summary.meshes], [20, 10]);
        // Picked as the model over the package it references, whose entry is only a part.
        assert.strictEqual((await check(files)).main, "root.usda");
        const error = await checkModelFiles(
            files,
            { main: "root.usda" },
            { ...DEFAULT_MODEL_LIMITS, maxTriangles: 19 },
        ).then(
            () => assert.fail("accepted"),
            (e: unknown) => e,
        );
        assert.instanceOf(error, ModelError);
        assert.deepInclude(error.fact, {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "triangles", found: 20, limit: 19 },
        });
        // A prim that writes its own type (Xform) is not the Mesh it references: OpenUSD draws no faces.
        const retyped = new Map(files);
        retyped.set("root.usda", text(refs.replaceAll('def "C', 'def Xform "C')));
        const xform = await checkModelFiles(retyped, { main: "root.usda" }, DEFAULT_MODEL_LIMITS);
        assert.deepStrictEqual([xform.summary.triangles, xform.summary.meshes], [0, 0]);
        // Without the package, the part is missing.
        assert.deepInclude(await refusalOf(new Map([["root.usda", text(refs)]])), { code: "E_MODEL_MISSING_FILE" });
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

    it("measure OpenEXR and Radiance HDR pictures, and count none of them: OpenUSD draws neither", async () => {
        const ascii = (text: string): number[] => Array.from(text, (c) => c.codePointAt(0) ?? 0);
        const int32 = (...values: number[]): number[] => [...new Uint8Array(Int32Array.from(values).buffer)];
        // A long attribute first (an image history), then the data window, 8192 x 8192.
        const history = ascii("x".repeat(70_000));
        const exr = Uint8Array.from([
            ...[0x76, 0x2f, 0x31, 0x01, 2, 0, 0, 0],
            ...ascii("history\0string\0"),
            ...int32(history.length),
            ...history,
            ...ascii("dataWindow\0box2i\0"),
            ...int32(16, 0, 0, 8191, 8191),
            0,
        ]);
        const hdr = new TextEncoder().encode("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 8192 +X 4096\n");
        assert.deepStrictEqual(imageSize(exr), { width: 8192, height: 8192 });
        assert.deepStrictEqual(imageSize(hdr), { width: 4096, height: 8192 });

        // Counted as drawn, the two would be over the 1 GiB texture limit.
        const layer = (file: string): string =>
            `def Material "M_${file.replace(".", "_")}" {\n` +
            `    token outputs:surface.connect = </M_${file.replace(".", "_")}/S.outputs:surface>\n` +
            `    def Shader "S" { uniform token info:id = "UsdPreviewSurface"\n` +
            `        color3f inputs:diffuseColor.connect = </M_${file.replace(".", "_")}/T.outputs:rgb>\n` +
            `        token outputs:surface }\n` +
            `    def Shader "T" { uniform token info:id = "UsdUVTexture"\n` +
            `        asset inputs:file = @maps/${file}@\n        color3f outputs:rgb }\n}\n`;
        const usda =
            `#usda 1.0\n${layer("ground.exr")}${layer("sky.hdr")}` +
            `def Mesh "Quad" { int[] faceVertexCounts = [4]\n    int[] faceVertexIndices = [0, 1, 2, 3]\n` +
            `    point3f[] points = [(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)] }\n`;
        const { summary } = await check(
            new Map([
                ["scene.usda", new TextEncoder().encode(usda)],
                ["maps/ground.exr", exr],
                ["maps/sky.hdr", hdr],
            ]),
        );
        assert.strictEqual(summary.textureBytes, 0);
        assert.sameMembers(
            (summary.pictures ?? []).map((p) => p.name),
            ["maps/ground.exr", "maps/sky.hdr"],
        );
    });
});

describe("a BVH file", () => {
    it("is refused as an unsupported format, by its bytes, its name, or inside a zip", async () => {
        const files = set("bvh", "walk.bvh");
        const [head] = files.values();
        assert.deepStrictEqual(detectModelFormat({ head }), { format: "bvh", supported: false });
        assert.deepStrictEqual(detectModelFormat({ filename: "walk.bvh" }), { format: "bvh", supported: false });
        assert.notInclude(assetFileExtensions("model"), ".bvh");
        assert.notInclude(BUILT_IN_MODEL_FORMATS, "bvh");
        const refusal = { code: "E_MODEL_FORMAT_UNSUPPORTED", params: { format: "bvh", fileName: "walk.bvh" } };
        assert.deepStrictEqual(await refusalOf(files), refusal);
        assert.deepStrictEqual(await refusalOf(new Map([["walk.zip", zipSync({ "walk.bvh": head })]])), refusal);
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
