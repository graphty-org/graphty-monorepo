/**
 * The checks of the formats read as text or plain binary (OBJ, STL, PLY, splats, `.babylon`) and
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
            ["splat", "points.splat"],
            ["spz", "combined_SPZv3.spz"],
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

    it("refuse a .splat whose length is not whole rows, and a .babylon that is not JSON", async () => {
        const splat = one("splat", "points.splat");
        const ragged = new Map([["points.splat", (splat.get("points.splat") as Uint8Array).slice(0, 33)]]);
        assert.strictEqual((await refusalOf(ragged)).code, "E_MODEL_STRUCTURE");
        const babylon = await refusalOf(text("cube.babylon", '{ "producer": {}, "meshes": [ '));
        assert.strictEqual(babylon.code, "E_MODEL_STRUCTURE");
    });

    it("upgrade glTF 1.0 and refuse a GLB version 1 cut short", async () => {
        const checked = await checkModelFiles(one("gltf1-embedded", "cube.gltf"), {}, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(checked.summary.gltfVersion, "1.0");
        const glb1 = one("glb1", "cube.glb");
        const cut = new Map([["cube.glb", (glb1.get("cube.glb") as Uint8Array).slice(0, 30)]]);
        assert.strictEqual((await refusalOf(cut)).code, "E_MODEL_STRUCTURE");
    });
});
