/**
 * `session.assets.addEach`: a folder, a .zip or a drop holding several models becomes one record
 * per model, each holding only the files it uses; a source of one model is `add` unchanged.
 */

import { assert, describe, it } from "vitest";

import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import { binaryStl, gltfPair, objSet, zip } from "../fixtures/models/fixtures";

/**
 * Several models in one folder: a .gltf with its .bin, an .obj with its .mtl and picture, an STL.
 * @returns path to bytes.
 */
function threeModels(): Map<string, Uint8Array> {
    return new Map([...gltfPair(), ...objSet(), ["part.stl", binaryStl()], ["notes.txt", new Uint8Array([104, 105])]]);
}

describe("assets.addEach", () => {
    it("adds each model of a folder as its own record, with the files it uses", async () => {
        const assets = createAssetsApi();
        const records = await assets.addEach({ files: threeModels() });
        assert.deepEqual(
            records.map((r) => [r.path, r.state, r.format]),
            [
                ["part.stl", "accepted", "stl"],
                ["quad.obj", "accepted", "obj"],
                ["tri.gltf", "accepted", "gltf"],
            ],
        );
        assert.sameMembers([...assets.files(records[1].id).keys()], ["quad.obj", "quad.mtl", "tex.png"]);
        assert.sameMembers([...assets.files(records[2].id).keys()], ["tri.gltf", "tri.bin"]);
        assert.equal(new Set(records.map((r) => r.id)).size, 3);
    });

    it("unpacks a zip of several models", async () => {
        const assets = createAssetsApi();
        const records = await assets.addEach(new Uint8Array(zip(Object.fromEntries(threeModels()))));
        assert.equal(records.length, 3);
    });

    it("names a model of the set refused outright by its own file", async () => {
        const assets = createAssetsApi();
        const files = new Map([...gltfPair(), ["broken.glb", new Uint8Array([1, 2, 3, 4])]]);
        const records = await assets.addEach({ files });
        const broken = records.find((r) => r.state === "rejected");
        assert.equal(broken?.path, "broken.glb");
        assert.isAbove(broken?.problems.length ?? 0, 0);
    });

    it("keeps none of the models it took when stopped partway", async () => {
        const assets = createAssetsApi();
        const controller = new AbortController();
        let ended = 0;
        const adding = assets.addEach(
            { files: threeModels() },
            {
                signal: controller.signal,
                // The first model is in when its end is reported: stop before the rest.
                onProgress: (change) => {
                    if (change.phase === "end" && change.outcome === "succeeded" && ++ended === 1) {
                        controller.abort();
                    }
                },
            },
        );
        let thrown: unknown;
        try {
            await adding;
        } catch (error) {
            thrown = error;
        }
        assert.instanceOf(thrown, Error);
        assert.equal(ended, 1);
        assert.deepEqual(assets.list(), []);
    });

    it("adds a set of one model as add does", async () => {
        const assets = createAssetsApi();
        const [only] = await assets.addEach({ files: gltfPair() });
        const same = await assets.add({ files: gltfPair() });
        assert.equal(only.id, same.id);
        assert.equal(only.state, "accepted");
    });
});
