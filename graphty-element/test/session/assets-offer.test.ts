/**
 * `session.assets.offer` and `waiting` (design/rendering/node-models.md sections 13.5 and 13.8): a
 * drop target hands every file to the session first, and each file exactly one waiting model is
 * missing goes to that model; the rest comes back to the caller, never guessed.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import { gltfPair, triangleGltf } from "../fixtures/models/fixtures";

const POLICE = new Uint8Array(readFileSync(new URL("../fixtures/models/police.glb", import.meta.url)));
const COLORMAP = new Uint8Array(readFileSync(new URL("../fixtures/models/Textures/colormap.png", import.meta.url)));

/**
 * A File of bytes.
 * @param bytes - The content.
 * @param name - The file name.
 * @returns The File.
 */
function file(bytes: Uint8Array, name: string): File {
    return new File([new Uint8Array(bytes)], name);
}

/**
 * A glTF triangle whose one picture is the separate file colormap.png beside it.
 * @returns path to bytes, without the picture.
 */
function trianglePaintedWithColormap(): Map<string, Uint8Array> {
    return gltfPair(
        triangleGltf({
            materials: [{ name: "painted", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ source: 0 }],
            images: [{ uri: "colormap.png" }],
        }),
    );
}

describe("assets.offer", () => {
    it("supplies the picture a waiting model is missing, by base name in any case", async () => {
        const assets = createAssetsApi();
        const police = await assets.add(file(POLICE, "police.glb"));
        assert.equal(police.state, "rejected");
        assert.deepEqual(
            assets.waiting().map((r) => r.id),
            [police.id],
        );

        const picture = file(COLORMAP, "ColorMap.PNG");
        const offered = await assets.offer([picture]);
        assert.deepEqual(offered.supplied, [
            { ref: police.id, name: "Textures/colormap.png", fileName: "ColorMap.PNG" },
        ]);
        assert.deepEqual(offered.rest, []);
        assert.isTrue(assets.list().some((r) => r.state === "accepted" && r.kind === "model"));
        assert.deepEqual(assets.waiting(), []);
    });

    it("returns every file in rest when no model waits", async () => {
        const assets = createAssetsApi();
        const picture = file(COLORMAP, "colormap.png");
        const offered = await assets.offer([picture]);
        assert.deepEqual(offered.supplied, []);
        assert.deepEqual(offered.rest, [picture]);
        assert.deepEqual(assets.list(), []);
    });

    it("never guesses between two waiting models that both miss the file", async () => {
        const assets = createAssetsApi();
        const police = await assets.add(file(POLICE, "police.glb"));
        const triangle = await assets.add({ files: trianglePaintedWithColormap() });
        assert.equal(triangle.state, "rejected");
        assert.sameMembers(
            assets.waiting().map((r) => r.id),
            [police.id, triangle.id],
        );

        const picture = file(COLORMAP, "colormap.png");
        const offered = await assets.offer([picture]);
        assert.deepEqual(offered.supplied, []);
        assert.deepEqual(offered.rest, [picture]);
        assert.equal(assets.waiting().length, 2);
    });

    it("leaves a file no waiting model names in rest beside the one it supplies", async () => {
        const assets = createAssetsApi();
        const police = await assets.add(file(POLICE, "police.glb"));
        const other = file(POLICE, "taxi.glb");
        const offered = await assets.offer([other, file(COLORMAP, "colormap.png")]);
        assert.deepEqual(
            offered.supplied.map((s) => s.ref),
            [police.id],
        );
        assert.deepEqual(offered.rest, [other]);
    });
});
