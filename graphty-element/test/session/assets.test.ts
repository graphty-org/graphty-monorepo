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

/** A served file: its status (200 by default), its bytes and the type header it is sent with. */
interface Served {
    readonly status?: number;
    readonly body?: Uint8Array;
    readonly type?: string;
}

/**
 * Stub fetch with a site: each URL (with its query) answers what it maps to, every other URL the
 * fallback (a 404 by default). Every URL requested is logged in order.
 * @param site - URL to what it answers.
 * @param fallback - What any other URL answers.
 * @returns The log of requested URLs.
 */
function stubSite(site: Record<string, Served>, fallback: Served = { status: 404 }): string[] {
    const log: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
        log.push(url);
        const { status = 200, body = new Uint8Array(0), type = null } = Object.hasOwn(site, url) ? site[url] : fallback;
        return Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
                get: (name: string) => ({ "content-length": String(body.length), "content-type": type })[name] ?? null,
            },
            body: null,
            arrayBuffer: () => Promise.resolve(body.slice().buffer),
        });
    });
    return log;
}

/**
 * A record's problem or warning with a code.
 * @param record - The record.
 * @param code - The code.
 * @returns Its params, or undefined.
 */
function factOf(record: AssetRecord, code: string): Record<string, unknown> | undefined {
    return record.problems.find((p) => p.code === code)?.params;
}

describe("session.assets: tolerant matching (design 12.5)", () => {
    const quad = "mtllib quad.mtl\nv 0 0 0\nv 1 0 0\nv 1 1 0\nusemtl m\nf 1 2 3\n";

    /**
     * An OBJ whose MTL names one picture, with the given files beside it.
     * @param name - The picture as the MTL writes it.
     * @param pictures - path to bytes of the pictures in the set.
     * @returns The set.
     */
    function objNaming(name: string, pictures: Record<string, Uint8Array>): Map<string, Uint8Array> {
        return new Map([
            ["quad.obj", utf8(quad)],
            ["quad.mtl", utf8(`newmtl m\nmap_Kd ${name}\n`)],
            ...Object.entries(pictures),
        ]);
    }

    it("takes the one file a reference names in another case, with a warning naming it", async () => {
        const record = await add({ files: objNaming("Wood.JPG", { "wood.jpg": PNG_1X1 }) });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.deepStrictEqual(factOf(record, "W_MODEL_PART_SUBSTITUTED"), {
            name: "Wood.JPG",
            used: "wood.jpg",
            referencedBy: "quad.mtl",
        });
    });

    it("reads backslashes as folders, with no warning", async () => {
        const record = await add({ files: objNaming("textures\\wood.png", { "textures/wood.png": PNG_1X1 }) });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.isUndefined(factOf(record, "W_MODEL_PART_SUBSTITUTED"));
    });

    it("matches a path from the author's disk by its base name only, and never requests it", async () => {
        for (const local of ["C:\\Users\\me\\wood.png", "/home/me/wood.png", "file:///C:/wood.png"]) {
            const record = await add({ files: objNaming(local, { "maps/wood.png": PNG_1X1 }) });
            assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
            assert.strictEqual(factOf(record, "W_MODEL_PART_SUBSTITUTED")?.used, "maps/wood.png");
        }

        // By URL, the base name is what is tried, beside the main file; the disk path never is.
        const base = "https://models.example.com/m/";
        const log = stubSite({
            [`${base}quad.obj`]: { body: utf8(quad) },
            [`${base}quad.mtl`]: { body: utf8("newmtl m\nmap_Kd C:\\Users\\me\\wood.png\n") },
            [`${base}wood.png`]: { body: PNG_1X1 },
        });
        try {
            const record = await createAssetsApi().ready(`${base}quad.obj`);
            assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
            assert.isFalse(
                log.some((url) => /Users|C:/i.test(decodeURIComponent(url))),
                log.join(" "),
            );
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("reports two files that match, and guesses neither", async () => {
        const record = await add({
            files: objNaming("Wood.png", { "a/wood.png": PNG_1X1, "b/wood.png": PNG_1X1 }),
        });
        assertRejected(record, "E_MODEL_PART_AMBIGUOUS", {
            name: "Wood.png",
            referencedBy: "quad.mtl",
            candidates: ["a/wood.png", "b/wood.png"],
        });
    });

    it("still refuses a web address, even when a file of its base name is in the set", async () => {
        const record = await add({ files: objNaming("http://host/x.png", { "x.png": PNG_1X1 }) });
        assertRejected(record, "E_MODEL_EXTERNAL_URL", { url: "http://host/x.png" });
    });
});

describe("session.assets: every missing part at once (design 12.4)", () => {
    it("lists each missing part in the order the model names them, with its role", async () => {
        const json = triangleGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, normalTexture: { index: 1 } }],
            textures: [{ source: 0 }, { source: 1 }],
            images: [{ uri: "color.png" }, { uri: "normal.png" }],
        });
        const record = await add({ files: new Map([["tri.gltf", utf8(JSON.stringify(json))]]) });
        assert.strictEqual(record.state, "rejected");
        assert.deepStrictEqual(
            record.problems.map((p) => [p.code, p.params.name, p.params.role, p.params.optional]),
            [
                ["E_MODEL_MISSING_FILE", "tri.bin", "geometry", false],
                ["E_MODEL_MISSING_FILE", "color.png", "texture", true],
                ["E_MODEL_MISSING_FILE", "normal.png", "texture", true],
            ],
        );
    });

    it("lists a missing .mtl as optional materials", async () => {
        const record = await add({ files: new Map([["quad.obj", utf8("mtllib quad.mtl\nv 0 0 0\nf 1 1 1\n")]]) });
        assertRejected(record, "E_MODEL_MISSING_FILE", { name: "quad.mtl", role: "materials", optional: true });
    });
});

describe("session.assets: the automatic tries for a model fetched by URL (design 12.2)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const base = "https://bucket.example.com/m/";

    it("retries a part refused without the main URL's query once with it", async () => {
        const query = "?X-Amz-Signature=abc&X-Amz-Expires=60";
        const log = stubSite({
            [`${base}tri.gltf${query}`]: { body: gltfPair().get("tri.gltf") },
            [`${base}tri.bin`]: { status: 403 },
            [`${base}tri.bin${query}`]: { body: TRIANGLE_BIN },
        });
        const record = await createAssetsApi().ready(`${base}tri.gltf${query}`);
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.deepStrictEqual(log, [`${base}tri.gltf${query}`, `${base}tri.bin`, `${base}tri.bin${query}`]);
    });

    it("never retries a 404 with the query, and names what it tried without the query", async () => {
        const query = "?X-Amz-Signature=abc";
        const log = stubSite({ [`${base}tri.gltf${query}`]: { body: gltfPair().get("tri.gltf") } });
        const record = await createAssetsApi().ready(`${base}tri.gltf${query}`);
        assertRejected(record, "E_MODEL_MISSING_FILE", {
            name: "tri.bin",
            role: "geometry",
            optional: false,
            tried: [`${base}tri.bin`],
        });
        assert.deepStrictEqual(log, [`${base}tri.gltf${query}`, `${base}tri.bin`]);
        assert.notInclude(JSON.stringify(record.problems), "?");
    });

    it("finds a picture in textures/ below the main file, and never leaves its folder or origin", async () => {
        const json = triangleGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ source: 0 }],
            images: [{ uri: "wood.png" }],
        });
        const log = stubSite({
            [`${base}tri.gltf`]: { body: utf8(JSON.stringify(json)), type: "text/plain" },
            [`${base}tri.bin`]: { body: TRIANGLE_BIN },
            [`${base}textures/wood.png`]: { body: PNG_1X1 },
        });
        const record = await createAssetsApi().ready(`${base}tri.gltf`);
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.include(log, `${base}textures/wood.png`);
        assert.isTrue(
            log.every((url) => url.startsWith(base)),
            log.join(" "),
        );
    });

    it("takes a web page answering for a missing file as a miss, within 16 extra requests a part", async () => {
        const json = triangleGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ source: 0 }],
            images: [{ uri: "maps/wood.png" }],
        });
        const query = "?sig=1";
        const page = { body: utf8("<!doctype html><html><body>app</body></html>") };
        const log = stubSite(
            {
                [`${base}tri.gltf${query}`]: { body: utf8(JSON.stringify(json)) },
                [`${base}tri.bin`]: { body: TRIANGLE_BIN },
            },
            page,
        );
        const record = await createAssetsApi().ready(`${base}tri.gltf${query}`);
        assertRejected(record, "E_MODEL_MISSING_FILE", { name: "maps/wood.png", role: "texture", optional: true });
        const tried = factOf(record, "E_MODEL_MISSING_FILE")?.tried as string[];
        assert.deepStrictEqual(tried, [
            `${base}maps/wood.png`,
            `${base}wood.png`,
            `${base}textures/wood.png`,
            `${base}Textures/wood.png`,
        ]);
        const forPicture = log.filter((url) => url.includes("wood.png"));
        assert.isAtMost(forPicture.length, 17);
        assert.isTrue(log.every((url) => url.startsWith(base)));
    });
});

describe("session.assets: a URL that is a web page (design 12.6)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reports a page as a web page, after a byte order mark and whitespace too", async () => {
        for (const text of ["<!DOCTYPE html><html></html>", "\uFEFF  \n\t<html lang=en>", "\r\n<HEAD></HEAD>"]) {
            stubSite({ "https://poly.example.com/m/42?ref=x": { body: utf8(text), type: "text/html" } });
            assertRejected(await createAssetsApi().ready("https://poly.example.com/m/42?ref=x"), "E_MODEL_WEB_PAGE", {
                url: "https://poly.example.com/m/42",
                host: "poly.example.com",
            });
        }
    });

    it("suggests the raw file behind a GitHub or GitLab blob page, without fetching it", async () => {
        const blob = "https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Box/Box.gltf";
        const log = stubSite({ [blob]: { body: utf8("<!doctype html>") } });
        assertRejected(await createAssetsApi().ready(blob), "E_MODEL_WEB_PAGE", {
            suggested: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/Box.gltf",
        });
        // Known by its address: nothing is requested, so a page sent with no CORS header (which a
        // browser fetch fails on) still says "web page", not "not reached".
        assert.deepStrictEqual(log, []);
        const lab = "https://gitlab.example.com/g/p/-/blob/main/a.glb";
        stubSite({ [lab]: { body: utf8("<!doctype html>") } });
        assertRejected(await createAssetsApi().ready(lab), "E_MODEL_WEB_PAGE", {
            suggested: "https://gitlab.example.com/g/p/-/raw/main/a.glb",
        });
    });

    it("says a Sketchfab or Poly Pizza model page is a web page without requesting it", async () => {
        const pages = ["https://sketchfab.com/3d-models/police-car-123abc", "https://poly.pizza/m/7f3k2"];
        const log = stubSite({});
        for (const page of pages) {
            assertRejected(await createAssetsApi().ready(page), "E_MODEL_WEB_PAGE", { host: new URL(page).host });
        }
        assert.deepStrictEqual(log, []);
    });

    it("decides by bytes: a .gltf sent as text/plain and a GLB sent as gltf-binary load", async () => {
        const base = "https://raw.example.com/m/";
        stubSite({
            [`${base}tri.gltf`]: { body: gltfPair().get("tri.gltf"), type: "text/plain" },
            [`${base}tri.bin`]: { body: TRIANGLE_BIN, type: "text/plain" },
            [`${base}a.glb`]: { body: texturedGlb(), type: "gltf-binary" },
        });
        const assets = createAssetsApi();
        assert.strictEqual((await assets.ready(`${base}tri.gltf`)).state, "accepted");
        assert.strictEqual((await assets.ready(`${base}a.glb`)).state, "accepted");
    });
});

describe("session.assets: a .zip URL (design 12.3)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const url = "https://cdn.example.com/kits/kit.zip?sig=secret";

    it("unpacks a zip as a drop, picks its main file and tries nothing outside it", async () => {
        const log = stubSite({
            [url]: {
                body: zip({
                    "scene/tri.gltf": gltfPair().get("tri.gltf") as Uint8Array,
                    "scene/tri.bin": TRIANGLE_BIN,
                }),
            },
        });
        const record = await createAssetsApi().ready(url);
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(record.path, "tri.gltf");
        assert.deepStrictEqual(log, [url]);

        stubSite({ [url]: { body: zip({ "tri.gltf": gltfPair().get("tri.gltf") as Uint8Array }) } });
        const missing = await createAssetsApi().ready(url);
        assertRejected(missing, "E_MODEL_MISSING_FILE", { name: "tri.bin" });
        assert.isUndefined(missing.problems[0].params.tried);
    });

    it("refuses the hostile zips with the reasons a dropped zip gets", async () => {
        const entries: Record<string, Uint8Array> = {};
        for (let i = 0; i < 1025; i++) {
            entries[`e${String(i)}.txt`] = new Uint8Array(1);
        }

        const cases: [Uint8Array, string][] = [
            [zip({ "tri.obj": new Uint8Array(4 * 1024 * 1024) }), "ratio"],
            [zip({ "inner.zip": zip({ "a.glb": texturedGlb() }) }), "nested"],
            [zip({ "a.glb": texturedGlb(), "A.glb": texturedGlb() }), "duplicate"],
            [zip(entries, 0), "entries"],
        ];
        for (const [archive, reason] of cases) {
            stubSite({ [url]: { body: archive } });
            assertRejected(await createAssetsApi().ready(url), "E_MODEL_ZIP", { reason });
            assertRejected(await add(file(archive, "kit.zip")), "E_MODEL_ZIP", { reason });
        }
    });

    it("lists at most 64 candidates of a zip holding 100 models, and counts the rest", async () => {
        const entries: Record<string, Uint8Array> = {};
        for (let i = 0; i < 100; i++) {
            entries[`m${String(i).padStart(3, "0")}.stl`] = binaryStl(1);
        }

        stubSite({ [url]: { body: zip(entries) } });
        const record = await createAssetsApi().ready(url);
        assertRejected(record, "E_MODEL_AMBIGUOUS", { more: 36 });
        const candidates = record.problems[0].params.candidates as string[];
        assert.strictEqual(candidates.length, 64);
        assert.deepStrictEqual(candidates, [...candidates].sort());
        assert.strictEqual(candidates[0], "m000.stl");
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
