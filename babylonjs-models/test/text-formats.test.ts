/**
 * The checks of the formats read as text or plain binary (OBJ, STL, PLY, `.babylon`) and
 * of glTF 1.0: each is held to the limits before it is parsed, and a damaged file is refused with
 * the rule it broke.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { checkModelFiles, DEFAULT_MODEL_LIMITS, type ModelLimits } from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A one-file set from a variant.
 * @param id - The variant.
 * @param name - The file.
 * @returns The set.
 */
function one(id: string, name: string): Map<string, Uint8Array> {
    return new Map([[name, new Uint8Array(readFileSync(join(VARIANTS, id, name)))]]);
}

/**
 * What checking a set threw.
 * @param files - The set.
 * @param limits - The limits.
 * @returns The first fact.
 */
async function refusalOf(files: Map<string, Uint8Array>, limits: Partial<ModelLimits> = {}) {
    const error = await checkModelFiles(files, {}, { ...DEFAULT_MODEL_LIMITS, ...limits }).then(
        () => assert.fail("the set was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error.fact;
}

const text = (name: string, body: string): Map<string, Uint8Array> => new Map([[name, new TextEncoder().encode(body)]]);

describe("the text and plain binary formats", () => {
    it("hold every format to the triangle limit", async () => {
        for (const [id, name] of [
            ["obj-alone", "cube.obj"],
            ["stl-ascii", "cube.stl"],
            ["stl-binary", "cube.stl"],
            ["ply-ascii", "cube.ply"],
            ["babylon", "cube.babylon"],
            ["ply-points-bin", "points.ply"],
        ]) {
            const fact = await refusalOf(one(id, name), { maxTriangles: 2 });
            assert.strictEqual(fact.code, "E_MODEL_TOO_LARGE", id);
        }
    });

    it("hold a text file to its byte limit before parsing it", async () => {
        const fact = await refusalOf(one("obj-alone", "cube.obj"), { maxTextBytes: 10 });
        assert.deepInclude(fact, { code: "E_MODEL_TOO_LARGE" });
        // By default only text longer than a browser's longest string (V8: 2^29 - 24) is refused.
        assert.strictEqual(DEFAULT_MODEL_LIMITS.maxTextBytes, 2 ** 29 - 24);
    });

    it("refuse a face naming a vertex the OBJ does not have, and a cut binary STL", async () => {
        const obj = await refusalOf(text("bad.obj", "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 9\n"));
        assert.strictEqual(obj.code, "E_MODEL_STRUCTURE");
        const stl = one("stl-binary", "cube.stl");
        const cut = new Map([["cube.stl", (stl.get("cube.stl") as Uint8Array).slice(0, 100)]]);
        assert.strictEqual((await refusalOf(cut)).code, "E_MODEL_STRUCTURE");
    });

    it("refuse a .babylon that is not JSON", async () => {
        const babylon = await refusalOf(text("cube.babylon", '{ "producer": {}, "meshes": [ '));
        assert.strictEqual(babylon.code, "E_MODEL_STRUCTURE");
    });

    it("refuse Gaussian splats as an unsupported format, naming the splat format", async () => {
        for (const [id, name, format] of [
            ["splat", "points.splat", "splat"],
            ["spz", "points.spz", "spz"],
            ["sog", "points.sog", "sog"],
            ["ply-splat", "splat.ply", "splat-ply"],
            ["ply-splat-compressed", "splat.compressed.ply", "splat-ply"],
        ]) {
            const fact = await refusalOf(one(id, name));
            assert.strictEqual(fact.code, "E_MODEL_FORMAT_UNSUPPORTED", id);
            assert.strictEqual(fact.params.format, format, id);
        }
    });

    it("refuse a splat PLY even when the caller says it is a PLY", async () => {
        const error = await checkModelFiles(
            one("ply-splat", "splat.ply"),
            { format: "ply" },
            DEFAULT_MODEL_LIMITS,
        ).then(
            () => assert.fail("the set was accepted"),
            (e: unknown) => e,
        );
        assert.instanceOf(error, ModelError);
        assert.deepInclude(error.fact, { code: "E_MODEL_FORMAT_UNSUPPORTED" });
        assert.strictEqual(error.fact.params.format, "splat-ply");
    });

    it("refuse a glTF that requires Gaussian splatting", async () => {
        for (const extension of ["KHR_gaussian_splatting", "KHR_gaussian_splatting_compression_spz_2"]) {
            const gltf = JSON.stringify({
                asset: { version: "2.0" },
                extensionsUsed: [extension],
                extensionsRequired: [extension],
            });
            const fact = await refusalOf(text("splats.gltf", gltf));
            assert.strictEqual(fact.code, "E_MODEL_FORMAT_UNSUPPORTED", extension);
            assert.deepInclude(fact.params, { format: "gltf", extension });
        }
    });

    it("upgrade glTF 1.0 and refuse a GLB version 1 cut short", async () => {
        const checked = await checkModelFiles(one("gltf1-embedded", "cube.gltf"), {}, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(checked.summary.gltfVersion, "1.0");
        const glb1 = one("glb1", "cube.glb");
        const cut = new Map([["cube.glb", (glb1.get("cube.glb") as Uint8Array).slice(0, 30)]]);
        assert.strictEqual((await refusalOf(cut)).code, "E_MODEL_STRUCTURE");
    });
});
