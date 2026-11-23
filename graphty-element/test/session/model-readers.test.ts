/**
 * Model files graphty-element's session refuses on intake, through `session.assets.add`: a
 * `.babylon` whose meshes load from other files, and glTF decoder data out of range. The readers
 * themselves are tested in babylonjs-models (test/readers.test.ts).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { createAssetsApi } from "../../src/session/assets/AssetsApi";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "../../../babylonjs-models/test/fixtures/variants");

/**
 * A variant's file.
 * @param id - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
function fixture(id: string, name: string): Uint8Array {
    return new Uint8Array(readFileSync(join(VARIANTS, id, name)));
}

describe("the .babylon reader", () => {
    it("is refused on intake with E_MODEL_STRUCTURE", async () => {
        const bytes = new TextEncoder().encode(JSON.stringify({ producer: {}, meshes: [{ delayLoadingFile: "a" }] }));
        const record = await createAssetsApi().add({ files: new Map([["cube.babylon", bytes]]) });
        assert.deepStrictEqual(record.problems[0], { code: "E_MODEL_STRUCTURE", params: { rule: "delayLoad" } });
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

    it("refuses Gaussian splats as a format it does not load", async () => {
        const record = await createAssetsApi().add({
            files: new Map([["points.spz", Uint8Array.from([0x1f, 0x8b, 0, 0])]]),
        });
        assert.deepInclude(record.problems[0], { code: "E_MODEL_FORMAT_UNSUPPORTED" });
        assert.strictEqual(record.problems[0]?.params.format, "spz");
    });
});
