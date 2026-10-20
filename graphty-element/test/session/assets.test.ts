/**
 * `session.assets`: model intake in Node, with no renderer (design/rendering/node-models.md
 * sections 2.4, 3.1 to 3.3 and 10).
 *
 * Every sample format is accepted and summarized; every hostile fixture is rejected with its
 * documented code. Nothing here can decode a model -- intake reads bytes and JSON only -- so a
 * rejection here is by construction "before any decode".
 */

import { createHash } from "node:crypto";

import { afterEach, assert, describe, it, vi } from "vitest";

import { detectModelFormat } from "../../src/catalog/detectModel";
import { isGraphtyError } from "../../src/errors";
import { type AssetRecord, type AssetsApi, createAssetsApi, isAssetId } from "../../src/session/assets/AssetsApi";
import { canonicalFileSet, sha256Fallback, sha256Hex } from "../../src/session/assets/digest";
import { createGraphSession } from "../../src/session/GraphSession";
import {
    accessorBomb,
    ASCII_PLY,
    ASCII_STL,
    binaryStl,
    glb,
    gltfPair,
    HOSTILE_REFERENCES,
    hugePngGltf,
    meshUsedBy,
    nodeChain,
    nodeCycle,
    objSet,
    PNG_1X1,
    texturedGlb,
    TRIANGLE_BIN,
    triangleGltf,
    utf8,
    zip,
} from "../fixtures/models/fixtures";

/**
 * Add a source and return its record.
 * @param source - What to add.
 * @param options - add's options.
 * @returns The settled record.
 */
function add(source: Parameters<AssetsApi["add"]>[0], options?: Parameters<AssetsApi["add"]>[1]): Promise<AssetRecord> {
    return createAssetsApi().add(source, options);
}

/**
 * Assert a record was rejected with one code and some params.
 * @param record - The record.
 * @param code - The expected code.
 * @param params - Params it must carry.
 */
function assertRejected(record: AssetRecord, code: string, params: Record<string, unknown> = {}): void {
    assert.strictEqual(record.state, "rejected", JSON.stringify(record.problems));
    assert.strictEqual(record.problems[0]?.code, code, JSON.stringify(record.problems));
    for (const [key, value] of Object.entries(params)) {
        assert.deepStrictEqual(
            record.problems[0].params[key],
            value,
            `${key} in ${JSON.stringify(record.problems[0].params)}`,
        );
    }
}

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
 * A File-shaped object with a folder path, as a folder pick gives.
 * @param path - The webkitRelativePath.
 * @param bytes - The content.
 * @returns The named blob.
 */
function folderFile(
    path: string,
    bytes: Uint8Array,
): { name: string; webkitRelativePath: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } {
    return {
        name: path.slice(path.lastIndexOf("/") + 1),
        webkitRelativePath: path,
        size: bytes.length,
        arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
    };
}

describe("session.assets: the sample formats", () => {
    it("accepts a .gltf with its .bin and summarizes it from the JSON", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({ files: gltfPair() });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(record.format, "gltf");
        assert.strictEqual(record.path, "tri.gltf");
        assert.match(record.id, /^asset:[0-9a-f]{64}$/);
        const summary = assets.inspect(record.id);
        assert.strictEqual(summary.triangles, 1);
        assert.strictEqual(summary.meshes, 1);
        assert.deepStrictEqual(summary.materials, ["plain"]);
        assert.deepStrictEqual(summary.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
        assert.strictEqual(summary.upAxis, "y");
    });

    it("accepts a GLB with an embedded PNG and reports its animation", async () => {
        const assets = createAssetsApi();
        const record = await assets.add(file(texturedGlb(), "painted.glb"));
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(record.format, "glb");
        assert.deepStrictEqual(record.problems, [{ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: ["spin"] } }]);
        const summary = assets.inspect(record.id);
        assert.strictEqual(summary.textures, 1);
        assert.strictEqual(summary.textureBytes, Math.ceil((4 * 4) / 3));
        assert.deepStrictEqual(summary.animations, [{ name: "spin", seconds: 2.5 }]);
    });

    it("accepts an OBJ with its MTL and texture, reading the file name after the option flags", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({ files: objSet() });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        const summary = assets.inspect(record.id);
        assert.strictEqual(summary.triangles, 2);
        assert.deepStrictEqual(summary.materials, ["painted"]);
        assert.strictEqual(summary.textures, 1);
    });

    it("accepts binary and ASCII STL, guessing Z up", async () => {
        for (const bytes of [binaryStl(2), ASCII_STL]) {
            const assets = createAssetsApi();
            const record = await assets.add(bytes);
            assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
            assert.strictEqual(record.format, "stl");
            assert.deepStrictEqual(record.problems, [
                { code: "W_MODEL_UP_GUESSED", params: { format: "stl", up: "z" } },
            ]);
            assert.strictEqual(assets.inspect(record.id).upAxis, "z");
        }
    });

    it("accepts a PLY triangle mesh", async () => {
        const record = await add(file(ASCII_PLY, "tri.ply"));
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(record.format, "ply");
    });

    it("accepts a .zip of a .gltf and its .bin, and a folder keyed by its relative paths", async () => {
        const zipped = zip({
            "robot/tri.gltf": utf8(JSON.stringify(triangleGltf())),
            "robot/tri.bin": TRIANGLE_BIN,
            "__MACOSX/._tri.gltf": utf8("x"),
        });
        const fromZip = await add(file(zipped, "robot.zip"));
        assert.strictEqual(fromZip.state, "accepted", JSON.stringify(fromZip.problems));
        assert.strictEqual(fromZip.path, "tri.gltf");

        const folder = await add([
            folderFile("kit/robot/tri.gltf", utf8(JSON.stringify(triangleGltf()))),
            folderFile("kit/robot/tri.bin", TRIANGLE_BIN),
        ]);
        assert.strictEqual(folder.state, "accepted", JSON.stringify(folder.problems));
        assert.strictEqual(folder.path, "tri.gltf");
    });

    it("chooses the best-ranked main file and drops same-name exports", async () => {
        const record = await add({
            files: new Map([
                ["rack.obj", utf8("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")],
                ["rack.fbx", utf8("Kaydara FBX Binary  \0")],
                ["rack.stl", binaryStl(1)],
                ["rack.glb", glb(triangleGltf({ buffers: [{ byteLength: 36 }] }), TRIANGLE_BIN)],
            ]),
        });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(record.path, "rack.glb");
    });
});

describe("session.assets: ids and records", () => {
    it("gives the same file set the same id, whatever order or folder it came in", async () => {
        const one = await add({ files: gltfPair() });
        const two = await add({ files: new Map([...gltfPair()].reverse()) });
        const three = await add([
            folderFile("x/tri.bin", TRIANGLE_BIN),
            folderFile("x/tri.gltf", gltfPair().get("tri.gltf") as Uint8Array),
        ]);
        assert.strictEqual(one.id, two.id);
        assert.strictEqual(one.id, three.id);
        assert.strictEqual(one.digest, createHash("sha256").update(canonicalFileSet(gltfPair())).digest("hex"));
    });

    it("uses the bundled SHA-256 when crypto.subtle is missing, with the same answer", async () => {
        const abc = utf8("abc");
        assert.strictEqual(
            await sha256Hex(abc, false),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
        const big = new Uint8Array(100_003).map((_, i) => i * 7);
        assert.strictEqual(await sha256Hex(big, false), createHash("sha256").update(big).digest("hex"));
        assert.strictEqual(sha256Fallback(new Uint8Array(0)).length, 32);
    });

    it("keeps a friendly name, refuses it for different files and reserves asset:sample/", async () => {
        const assets = createAssetsApi();
        const named = await assets.add({ files: gltfPair() }, { name: "asset:rack" });
        assert.strictEqual(named.id, "asset:rack");
        assert.strictEqual((await assets.add({ files: gltfPair() }, { name: "asset:rack" })).id, "asset:rack");
        assertRejected(await assets.add(binaryStl(1), { name: "asset:rack" }), "E_MODEL_NAME_TAKEN", {
            id: "asset:rack",
        });
        assertRejected(await assets.add(binaryStl(1), { name: "asset:sample/server" }), "E_MODEL_NAME_TAKEN");
        assert.strictEqual(assets.get("asset:rack")?.state, "accepted");
    });

    it("lists, returns copies of the files, removes, and keeps assets out of the journal", async () => {
        const session = createGraphSession();
        const record = await session.assets.add({ files: gltfPair() });
        assert.deepStrictEqual(
            session.assets.list().map((r) => r.id),
            [record.id],
        );
        const files = session.assets.files(record.id);
        assert.deepStrictEqual([...files.keys()].sort(), ["tri.bin", "tri.gltf"]);
        (files.get("tri.bin") as Uint8Array)[0] = 99;
        assert.notStrictEqual(session.assets.files(record.id).get("tri.bin")?.[0], 99);
        assert.isTrue(Object.isFrozen(record));
        assert.strictEqual(session.journal.entries.length, 0);
        assert.isFalse(session.canUndo);
        session.assets.remove(record.id);
        assert.strictEqual(session.assets.get(record.id), undefined);
        assert.throws(() => session.assets.inspect(record.id), /accepted model/);
        session.dispose();
    });

    it("resolves ready for an id it holds, and rejects an id it does not", async () => {
        const assets = createAssetsApi();
        const record = await assets.add({ files: gltfPair() });
        assert.strictEqual((await assets.ready(record.id)).state, "accepted");
        assertRejected(await assets.ready("asset:nothing"), "E_MODEL_UNKNOWN_ASSET", { id: "asset:nothing" });
    });

    it("tells asset ids from URLs", () => {
        assert.isTrue(isAssetId("asset:rack"));
        assert.isTrue(isAssetId("asset:sample/server"));
        assert.isFalse(isAssetId("https://example.com/rack.glb"));
        assert.isFalse(isAssetId("asset:../x"));
        assert.isFalse(isAssetId("asset:"));
    });

    it("checks setLimits and allowHosts and applies a lowered limit", async () => {
        const assets = createAssetsApi();
        assert.throws(() => {
            assets.setLimits({ maxBytes: -1 });
        }, /positive/);
        assert.throws(() => {
            assets.allowHosts(["https://x"]);
        }, /host/);
        assets.allowHosts(["Models.Example.com"]);
        assert.isTrue(assets.hostAllowed("models.example.com"));
        assets.setLimits({ maxTriangles: 1 });
        assertRejected(await assets.add(binaryStl(2)), "E_MODEL_TOO_LARGE", { what: "triangles", found: 2, limit: 1 });
        assets.setLimits({ maxBytes: 10 });
        assertRejected(await assets.add(binaryStl(2)), "E_MODEL_TOO_LARGE", { what: "bytes" });
    });

    it("refuses a bad name with E_BAD_COMMAND", async () => {
        try {
            await add(binaryStl(1), { name: "rack" as `asset:${string}` });
            assert.fail("expected a throw");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }
    });
});

describe("session.assets: hostile files, each refused with its code", () => {
    for (const ref of HOSTILE_REFERENCES) {
        it(`refuses the reference ${ref}`, async () => {
            const json = triangleGltf({ buffers: [{ uri: ref, byteLength: 36 }] });
            assertRejected(await add({ files: gltfPair(json) }), "E_MODEL_EXTERNAL_URL");
        });
    }

    it("refuses an image reference outside the set, and names a missing file", async () => {
        const external = triangleGltf({ textures: [{ source: 0 }], images: [{ uri: "https://host/x.png" }] });
        assertRejected(await add({ files: gltfPair(external) }), "E_MODEL_EXTERNAL_URL", { url: "https://host/x.png" });
        const missing = triangleGltf({ textures: [{ source: 0 }], images: [{ uri: "bark.png" }] });
        assertRejected(await add({ files: gltfPair(missing) }), "E_MODEL_MISSING_FILE", {
            name: "bark.png",
            referencedBy: "tri.gltf",
        });
    });

    it("refuses a map_Kd line whose file is a URL behind -o flags", async () => {
        assertRejected(
            await add({ files: objSet("newmtl x\nmap_Kd -o 1 1 1 http://host/x.png\n") }),
            "E_MODEL_EXTERNAL_URL",
            { url: "http://host/x.png" },
        );
    });

    it("refuses an accessor of 2e8 elements with no buffer view", async () => {
        assertRejected(await add({ files: accessorBomb() }), "E_MODEL_TOO_LARGE", { what: "decodedBytes" });
    });

    it("refuses a node cycle", async () => {
        assertRejected(await add({ files: nodeCycle() }), "E_MODEL_STRUCTURE", { rule: "cycle" });
    });

    it("refuses a 100,000-deep chain", async () => {
        assertRejected(await add({ files: nodeChain(100_000) }), "E_MODEL_STRUCTURE", { rule: "depth" });
        assertRejected(await add({ files: nodeChain(65) }), "E_MODEL_STRUCTURE", { rule: "depth" });
        assert.strictEqual((await add({ files: nodeChain(64) })).state, "accepted");
    });

    it("counts the triangles of a mesh per use, refusing one mesh used by 100,000 nodes", async () => {
        assertRejected(await add({ files: meshUsedBy(100_000) }), "E_MODEL_TOO_LARGE", {
            what: "triangles",
            limit: 1_000_000,
        });
        const assets = createAssetsApi();
        const few = await assets.add({ files: meshUsedBy(3) });
        assert.strictEqual(few.state, "accepted", JSON.stringify(few.problems));
        assert.strictEqual(assets.inspect(few.id).triangles, 36);
    });

    it("refuses a zip with two names that differ only in case", async () => {
        const archive = zip({ "a.glb": texturedGlb(), "A.glb": texturedGlb() });
        assertRejected(await add(file(archive, "kit.zip")), "E_MODEL_ZIP", { reason: "duplicate" });
    });

    it("refuses a zip entry that inflates 1,000:1", async () => {
        const archive = zip({ "tri.obj": new Uint8Array(4 * 1024 * 1024) });
        assert.isBelow(archive.length, (4 * 1024 * 1024) / 500);
        assertRejected(await add(file(archive, "bomb.zip")), "E_MODEL_ZIP", { reason: "ratio" });
    });

    it("refuses a zip inside a zip, by name or by bytes", async () => {
        const inner = zip({ "tri.glb": texturedGlb() });
        assertRejected(await add(file(zip({ "inner.zip": inner }), "outer.zip")), "E_MODEL_ZIP", {
            reason: "nested",
        });
        assertRejected(await add(file(zip({ "inner.bin": inner }, 0), "outer.zip")), "E_MODEL_ZIP", {
            reason: "nested",
        });
    });

    it("refuses OBJ face indices out of range", async () => {
        for (const face of ["f 1 2 99", "f 0 1 2", "f -4 1 2", "f 1 2 1e30"]) {
            assertRejected(
                await add(file(utf8(`v 0 0 0\nv 1 0 0\nv 0 1 0\n${face}\n`), "bad.obj")),
                "E_MODEL_STRUCTURE",
                { rule: "index" },
            );
        }
    });

    it("refuses a binary STL whose triangle count does not match its length", async () => {
        assertRejected(await add(file(binaryStl(1, 1000), "bad.stl")), "E_MODEL_STRUCTURE", { rule: "length" });
    });

    it("refuses a PNG header claiming 65,536 x 65,536", async () => {
        assertRejected(await add({ files: hugePngGltf() }), "E_MODEL_TOO_LARGE", { what: "textureSize", found: 65536 });
    });

    it("refuses __proto__ and duplicate keys in glTF JSON, and nesting past 64", async () => {
        const proto = utf8('{"asset":{"version":"2.0"},"__proto__":{"x":1}}');
        assertRejected(await add(file(proto, "p.gltf")), "E_MODEL_STRUCTURE", { rule: "json" });
        const twice = utf8('{"asset":{"version":"2.0"},"nodes":[],"nodes":[]}');
        assertRejected(await add(file(twice, "d.gltf")), "E_MODEL_STRUCTURE", { rule: "json", key: "nodes" });
        const deep = utf8(`{"asset":{"version":"2.0"},"extras":${"[".repeat(70)}${"]".repeat(70)}}`);
        assertRejected(await add(file(deep, "deep.gltf")), "E_MODEL_STRUCTURE", { rule: "depth" });
    });

    it("refuses out-of-range indices and accessors that overrun their view", async () => {
        assertRejected(await add({ files: gltfPair(triangleGltf({ nodes: [{ mesh: 5 }] })) }), "E_MODEL_STRUCTURE", {
            rule: "index",
        });
        const overrun = triangleGltf({ accessors: [{ bufferView: 0, componentType: 5126, count: 4, type: "VEC3" }] });
        assertRejected(await add({ files: gltfPair(overrun) }), "E_MODEL_STRUCTURE", { rule: "accessor" });
        const shortBuffer = triangleGltf({ buffers: [{ uri: "tri.bin", byteLength: 1000 }] });
        assertRejected(await add({ files: gltfPair(shortBuffer) }), "E_MODEL_STRUCTURE", { rule: "accessor" });
    });

    it("refuses compression with no decoder and GPU instancing", async () => {
        const draco = triangleGltf({
            extensionsUsed: ["KHR_draco_mesh_compression"],
            extensionsRequired: ["KHR_draco_mesh_compression"],
        });
        assertRejected(await add({ files: gltfPair(draco) }), "E_MODEL_DECODER_UNAVAILABLE", {
            extension: "KHR_draco_mesh_compression",
        });
        const instanced = triangleGltf({ extensionsUsed: ["EXT_mesh_gpu_instancing"] });
        assertRejected(await add({ files: gltfPair(instanced) }), "E_MODEL_STRUCTURE", { rule: "instancing" });
    });

    it("names formats it recognizes but does not load, and refuses what it does not know", async () => {
        assertRejected(await add(file(utf8("Kaydara FBX Binary  \0rest"), "rig.fbx")), "E_MODEL_FORMAT_UNSUPPORTED", {
            format: "fbx",
        });
        assertRejected(await add(file(utf8("hello"), "notes.txt")), "E_MODEL_FORMAT_UNKNOWN", {
            fileName: "notes.txt",
        });
        const points = utf8("ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\nend_header\n0\n");
        assertRejected(await add(file(points, "cloud.ply")), "E_MODEL_FORMAT_UNSUPPORTED", { format: "points" });
    });

    it("asks which file when two different candidates tie, and takes the caller's choice", async () => {
        const files = new Map([
            ["a.stl", binaryStl(1)],
            ["b.stl", binaryStl(2)],
        ]);
        assertRejected(await add({ files }), "E_MODEL_AMBIGUOUS", { candidates: ["a.stl", "b.stl"] });
        assert.strictEqual((await add({ files }, { main: "b.stl" })).path, "b.stl");
    });
});

describe("session.assets: fetching a URL", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /**
     * Stub fetch with one answer.
     * @param status - The status.
     * @param body - The body.
     * @returns The spy.
     */
    function stubFetch(status: number, body: Uint8Array) {
        const spy = vi.fn((_url: string, _init: Record<string, unknown>) =>
            Promise.resolve({
                ok: status >= 200 && status < 300,
                status,
                headers: { get: (name: string) => (name === "content-length" ? String(body.length) : null) },
                body: null,
                arrayBuffer: () => Promise.resolve(body.slice().buffer),
            }),
        );
        vi.stubGlobal("fetch", spy);
        return spy;
    }

    it("fetches once with no credentials and no referrer, shared by every ready()", async () => {
        const spy = stubFetch(200, binaryStl(1));
        const assets = createAssetsApi();
        const [a, b] = await Promise.all([
            assets.ready("https://example.com/m/rack.stl?v=1"),
            assets.ready("https://example.com/m/rack.stl?v=1"),
        ]);
        assert.strictEqual(spy.mock.calls.length, 1);
        assert.strictEqual(a.state, "accepted", JSON.stringify(a.problems));
        assert.strictEqual(a.id, b.id);
        assert.strictEqual(a.path, "rack.stl");
        const init = spy.mock.calls[0][1];
        assert.strictEqual(init.credentials, "omit");
        assert.strictEqual(init.referrerPolicy, "no-referrer");
        // The same bytes dropped as a file get the same id.
        assert.strictEqual((await assets.add(file(binaryStl(1), "rack.stl"))).id, a.id);
    });

    it("reports a failed fetch without its query string, and refuses credentials and other schemes", async () => {
        stubFetch(404, new Uint8Array(0));
        const assets = createAssetsApi();
        assertRejected(await assets.ready("https://example.com/m/rack.glb?token=secret"), "E_MODEL_FETCH", {
            url: "https://example.com/m/rack.glb",
            status: 404,
        });
        assertRejected(await assets.ready("https://user:pw@example.com/rack.glb"), "E_MODEL_URL_BLOCKED");
        assertRejected(await assets.ready("file:///etc/passwd"), "E_MODEL_URL_BLOCKED");
    });

    it("refuses a response over the byte limit from its declared length", async () => {
        stubFetch(200, new Uint8Array(64));
        const assets = createAssetsApi();
        assets.setLimits({ maxBytes: 10 });
        assertRejected(await assets.ready("https://example.com/big.glb"), "E_MODEL_TOO_LARGE", {
            what: "bytes",
            found: 64,
        });
    });
});

describe("detectModelFormat", () => {
    it("answers from the bytes first, the extension second", () => {
        assert.deepStrictEqual(detectModelFormat({ head: texturedGlb() }), { format: "glb", supported: true });
        assert.deepStrictEqual(detectModelFormat({ filename: "x.bin", head: utf8('{"asset":{"version":"2.0"}}') }), {
            format: "gltf",
            supported: true,
        });
        assert.deepStrictEqual(detectModelFormat({ head: binaryStl(3) }), { format: "stl", supported: true });
        assert.deepStrictEqual(detectModelFormat({ head: ASCII_STL }), { format: "stl", supported: true });
        assert.deepStrictEqual(detectModelFormat({ head: ASCII_PLY }), { format: "ply", supported: true });
        assert.deepStrictEqual(detectModelFormat({ head: utf8("v 0 0 0\nf 1 1 1\n") }), {
            format: "obj",
            supported: true,
        });
        assert.deepStrictEqual(detectModelFormat({ filename: "kit.zip", head: zip({ "a.glb": texturedGlb() }) }), {
            format: "zip",
            supported: true,
        });
        assert.deepStrictEqual(detectModelFormat({ filename: "scene.usdz", head: zip({ "a.usdc": PNG_1X1 }) }), {
            format: "usdz",
            supported: false,
        });
        assert.deepStrictEqual(detectModelFormat({ filename: "rig.fbx" }), { format: "fbx", supported: false });
        assert.deepStrictEqual(detectModelFormat({ filename: "a.splat" }), { format: "splat", supported: false });
    });

    it("says nothing about graph data", () => {
        assert.isUndefined(detectModelFormat({ filename: "graph.csv", head: utf8("source,target\na,b\n") }));
        assert.isUndefined(detectModelFormat({ filename: "graph.json", head: utf8('{"nodes":[],"edges":[]}') }));
        assert.isUndefined(detectModelFormat({ filename: "session.cys", head: zip({ "a.xml": utf8("<x/>") }) }));
    });
});
