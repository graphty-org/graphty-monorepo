/**
 * How a model's references are checked and resolved (src/files/references.ts), and how a zip is
 * unpacked (src/files/unzip.ts): data URLs, schemes that are never fetched, names written in
 * another case or as a path on the author's disk, web addresses and paths above the folder, and
 * the archives a zip check refuses.
 */

import { zipSync } from "fflate";
import { assert, describe, it } from "vitest";

import { imageSize, ModelError, resolveReference } from "../src/files/references.js";
import { unzipModel } from "../src/files/unzip.js";

const BYTES = Uint8Array.from([1, 2, 3]);

/**
 * The code of what a call threw.
 * @param call - The call.
 * @returns The ModelError's first fact.
 */
function factOf(call: () => unknown): ModelError["fact"] {
    try {
        call();
    } catch (error) {
        assert.instanceOf(error, ModelError);
        return error.fact;
    }
    return assert.fail("it did not throw");
}

/**
 * What an unzip rejected with.
 * @param zip - The archive.
 * @param max - The unzipped byte cap.
 * @returns The first fact.
 */
async function unzipFact(zip: Uint8Array, max = 1024 * 1024): Promise<ModelError["fact"]> {
    const error = await unzipModel(zip, max).then(
        () => assert.fail("it unzipped"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error.fact;
}

describe("resolving a reference", () => {
    const files = new Map([
        ["cube.bin", BYTES],
        ["textures/wood.png", BYTES],
        ["cdn.example/t/wood.png", BYTES],
    ]);

    it("reads a data URL of bytes or a picture, and refuses any other", () => {
        assert.deepStrictEqual(
            [...resolveReference("data:application/octet-stream;base64,AQID", "a.gltf", files).bytes],
            [1, 2, 3],
        );
        assert.strictEqual(
            factOf(() => resolveReference("data:text/html,x", "a.gltf", files)).code,
            "E_MODEL_EXTERNAL_URL",
        );
    });

    it("refuses a scheme that is not a web address, and an escape it cannot decode", () => {
        for (const ref of ["blob:https://a/b", "javascript:alert(1)", "ftp://host/x.bin", "%E0%A4%A"]) {
            assert.strictEqual(factOf(() => resolveReference(ref, "a.gltf", files)).code, "E_MODEL_EXTERNAL_URL", ref);
        }
    });

    it("finds a name written in another case or with backslashes, and says it substituted", () => {
        const upper = resolveReference("CUBE.BIN", "a.gltf", files);
        assert.strictEqual(upper.path, "cube.bin");
        assert.strictEqual(upper.substituted?.code, "W_MODEL_PART_SUBSTITUTED");
        assert.strictEqual(resolveReference("textures\\wood.png", "a.gltf", files).path, "textures/wood.png");
    });

    it("reads a path on the author's disk by its base name", () => {
        assert.strictEqual(resolveReference("C:\\Users\\me\\cube.bin", "a.gltf", files).path, "cube.bin");
        assert.strictEqual(resolveReference("file:///home/me/cube.bin", "a.gltf", files).path, "cube.bin");
    });

    it("holds a web address and a path above the folder under their keys, and names them when missing", () => {
        assert.strictEqual(
            resolveReference("https://cdn.example/t/wood.png", "a.gltf", files).path,
            "cdn.example/t/wood.png",
        );
        assert.strictEqual(resolveReference("../textures/wood.png", "a.gltf", files).path, "textures/wood.png");
        const missing = factOf(() =>
            resolveReference("https://cdn.example/t/oak.png", "a.gltf", files, "https://models.example/a.gltf"),
        );
        assert.strictEqual(missing.code, "E_MODEL_MISSING_FILE");
        assert.strictEqual(missing.params.url, "https://cdn.example/t/oak.png");
        assert.strictEqual(factOf(() => resolveReference("stone.png", "a.gltf", files)).code, "E_MODEL_MISSING_FILE");
    });

    it("refuses a name several files of the set match", () => {
        const two = new Map([
            ["a/wood.png", BYTES],
            ["b/wood.png", BYTES],
        ]);
        assert.strictEqual(factOf(() => resolveReference("wood.png", "m.gltf", two)).code, "E_MODEL_PART_AMBIGUOUS");
    });
});

describe("picture sizes from headers", () => {
    it("reads a JPEG's frame and returns nothing for bytes that are no picture", () => {
        // SOI, then a baseline SOF0 frame of 3 x 2.
        const jpeg = Uint8Array.from([
            0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 2, 0, 3, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
        ]);
        assert.deepStrictEqual(imageSize(jpeg), { width: 3, height: 2 });
        assert.isUndefined(imageSize(Uint8Array.from([1, 2, 3, 4])));
    });
});

describe("unzipping", () => {
    it("skips folders and macOS metadata, and refuses an empty archive", async () => {
        const zip = zipSync({ "kit/": new Uint8Array(0), "__MACOSX/._a.glb": BYTES, "kit/a.glb": BYTES });
        assert.deepStrictEqual([...(await unzipModel(zip, 1024)).keys()], ["kit/a.glb"]);
        assert.deepStrictEqual(await unzipFact(zipSync({})), { code: "E_MODEL_ZIP", params: { reason: "empty" } });
    });

    it("refuses damaged bytes, a path that leaves the archive, and more bytes than the cap", async () => {
        assert.strictEqual((await unzipFact(Uint8Array.from([0x50, 0x4b, 3, 4, 9, 9, 9, 9]))).code, "E_MODEL_ZIP");
        assert.instanceOf(
            await unzipModel(zipSync({ "../evil.glb": BYTES }), 1024).catch((e: unknown) => e),
            ModelError,
        );
        const big = await unzipFact(zipSync({ "a.bin": new Uint8Array(4096) }, { level: 0 }), 100);
        assert.strictEqual(big.code, "E_MODEL_TOO_LARGE");
        assert.strictEqual(big.params.what, "unzipped");
    });

    it("refuses a bomb, a nested zip and two names that differ only by case", async () => {
        assert.deepStrictEqual(await unzipFact(zipSync({ "a.bin": new Uint8Array(1_000_000) })), {
            code: "E_MODEL_ZIP",
            params: { reason: "ratio", limit: 100 },
        });
        assert.strictEqual((await unzipFact(zipSync({ "inner.zip": BYTES }))).params.reason, "nested");
        assert.strictEqual((await unzipFact(zipSync({ "A.glb": BYTES, "a.glb": BYTES }))).params.reason, "duplicate");
    });
});
