/**
 * `session.network` and models fetched by URL (design/rendering/node-models.md sections 2.6 and
 * 3.3): one question per URL, an answer that holds for its host, policies for the page and the
 * project, and a model fetched by URL bringing its own files from beside it.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../session";
import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import { createNetworkApi, isPrivateHost, type NetworkRequest } from "../../src/session/network";
import { gltfPair, objSet, PNG_1X1, sphereGlb, triangleGltf, utf8 } from "../fixtures/models/fixtures";

/**
 * A gate that records what it published.
 * @returns The gate and its requests.
 */
function gate() {
    const published: NetworkRequest[] = [];
    const network = createNetworkApi((request) => published.push(request));
    return { network, published };
}

const RACK = new URL("https://models.example.com/kit/rack.glb");
const OTHER = new URL("https://models.example.com/kit/other.glb");
const ELSEWHERE = new URL("https://elsewhere.example.org/x.glb");

describe("session.network", () => {
    it("asks once per URL, and an answer holds for its host", async () => {
        const { network, published } = gate();
        const first = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        const again = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        const sameHost = network.ask({ url: OTHER, kind: "model", by: "data", layerIds: [] });
        const elsewhere = network.ask({ url: ELSEWHERE, kind: "model", by: "ai", layerIds: [] });
        assert.lengthOf(published, 3, "one request per URL");
        assert.deepEqual(
            network.pending().map((request) => request.params.url),
            [RACK.href, OTHER.href, ELSEWHERE.href],
        );
        assert.equal(published[0].code, "W_URL_NEEDS_APPROVAL");
        assert.equal(published[0].params.host, "models.example.com");

        await network.allow(published[0].params.id);
        assert.isTrue(await first);
        assert.isTrue(await again);
        assert.isTrue(await sameHost, "the host is allowed for the session");
        assert.isTrue(await network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] }));
        assert.lengthOf(published, 3, "an allowed host asks no more");

        network.deny(published[2].params.id);
        assert.isFalse(await elsewhere);
        assert.deepEqual(network.pending(), []);
    });

    it("never shows a URL's query or credentials", () => {
        const { network, published } = gate();
        void network.ask({
            url: new URL("https://user:pw@models.example.com/rack.glb?token=secret"),
            kind: "model",
            by: "file",
            layerIds: [],
        });
        assert.equal(published[0].params.url, "https://models.example.com/rack.glb");
    });

    it("stops asking under the page's policy or the project's, and allowHosts as code does", async () => {
        const { network, published } = gate();
        const waiting = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        network.setProjectPolicy("allow");
        assert.isTrue(await waiting, "the project's policy releases what waits");
        assert.isTrue(await network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] }));
        network.setProjectPolicy("ask");

        network.setPolicy("allow");
        assert.isTrue(await network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] }));
        network.setPolicy("ask");

        network.allowHosts(["elsewhere.example.org"]);
        assert.isTrue(await network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] }));
        assert.lengthOf(published, 1);
    });

    it("remembers an answer for the project when asked to", async () => {
        const { network, published } = gate();
        const waiting = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        await network.allow(published[0].params.id, { remember: "project" });
        assert.isTrue(await waiting);
        assert.equal(network.projectPolicy, "allow");
    });

    it("refuses an id that is not waiting", async () => {
        const { network } = gate();
        const error = await network.allow("nope").catch((caught: unknown) => caught);
        assert.equal((error as { code?: string }).code, "E_BAD_COMMAND");
    });

    it("asks for a part supplied on another host as by: supplied, and knows private hosts", async () => {
        const { network, published } = gate();
        const answer = network.ask({
            url: new URL("https://pictures.example.org/colormap.png?sig=abc"),
            kind: "texture",
            by: "supplied",
            layerIds: [],
        });
        assert.deepInclude(published[0].params, {
            url: "https://pictures.example.org/colormap.png",
            kind: "texture",
            by: "supplied",
        });
        network.deny(published[0].params.id);
        assert.isFalse(await answer);
        for (const host of ["localhost", "127.0.0.1", "10.0.0.2", "192.168.1.4", "169.254.0.1", "[::1]", "nas.local"]) {
            assert.isTrue(isPrivateHost(host), host);
        }

        assert.isFalse(isPrivateHost("pictures.example.org"));
    });

    it("saves the project's policy and reads it back; a file without it asks", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        session.network.setProjectPolicy("allow");
        const { text } = await session.project.save();

        const opened = createGraphSession();
        await opened.project.open(text);
        assert.equal(opened.network.projectPolicy, "allow");

        session.network.setProjectPolicy("ask");
        await opened.project.open((await session.project.save()).text, { discard: true });
        assert.equal(opened.network.projectPolicy, "ask");
    });
});

describe("a model fetched by URL brings the files beside it", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /**
     * Answer fetch from a table of URLs; anything else is a 404.
     * @param files - URL to bytes.
     * @returns The spy.
     */
    function serve(files: ReadonlyMap<string, Uint8Array>) {
        const spy = vi.fn((url: string, _init: Record<string, unknown>) => {
            const body = files.get(url);
            return Promise.resolve({
                ok: body !== undefined,
                status: body === undefined ? 404 : 200,
                headers: { get: () => null },
                body: null,
                arrayBuffer: () => Promise.resolve((body ?? new Uint8Array(0)).slice().buffer),
            });
        });
        vi.stubGlobal("fetch", spy);
        return spy;
    }

    /**
     * A file set served under a folder URL.
     * @param base - The folder.
     * @param files - Path to bytes.
     * @returns URL to bytes.
     */
    function under(base: string, files: ReadonlyMap<string, Uint8Array>): Map<string, Uint8Array> {
        return new Map([...files].map(([path, bytes]) => [`${base}${path}`, bytes]));
    }

    it("fetches a .gltf's .bin and texture from beside it, with no credentials", async () => {
        const json = triangleGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ source: 0 }],
            images: [{ uri: "maps/tex.png" }],
        });
        const set = new Map([...gltfPair(json), ["maps/tex.png", PNG_1X1]]);
        const spy = serve(under("https://models.example.com/kit/", set));
        const record = await createAssetsApi().add("https://models.example.com/kit/tri.gltf");
        assert.equal(record.state, "accepted", JSON.stringify(record.problems));
        assert.equal(record.path, "tri.gltf");
        assert.deepEqual(
            spy.mock.calls.map(([url]) => url),
            [
                "https://models.example.com/kit/tri.gltf",
                "https://models.example.com/kit/tri.bin",
                "https://models.example.com/kit/maps/tex.png",
            ],
        );
        for (const [, init] of spy.mock.calls) {
            assert.equal(init.credentials, "omit");
            assert.equal(init.referrerPolicy, "no-referrer");
        }
    });

    it("fetches an .obj's .mtl and the image the .mtl names", async () => {
        const spy = serve(under("https://models.example.com/kit/", objSet()));
        const record = await createAssetsApi().add("https://models.example.com/kit/quad.obj");
        assert.equal(record.state, "accepted", JSON.stringify(record.problems));
        assert.lengthOf(spy.mock.calls, 3);
    });

    it("refuses a reference to another host or above the folder, and fetches only the main file", async () => {
        for (const uri of ["https://elsewhere.example.org/tri.bin", "../tri.bin", "//elsewhere.example.org/x.bin"]) {
            const json = triangleGltf({ buffers: [{ uri, byteLength: 36 }] });
            const spy = serve(new Map([["https://models.example.com/kit/tri.gltf", utf8(JSON.stringify(json))]]));
            const record = await createAssetsApi().add("https://models.example.com/kit/tri.gltf");
            assert.equal(record.problems[0]?.code, "E_MODEL_EXTERNAL_URL", uri);
            assert.lengthOf(spy.mock.calls, 1, uri);
        }
    });

    it("holds the files together to the byte limit, and a missing one is reported missing", async () => {
        const set = gltfPair();
        serve(under("https://models.example.com/kit/", set));
        const assets = createAssetsApi();
        assets.setLimits({ maxBytes: (set.get("tri.gltf")?.length ?? 0) + 10 });
        const record = await assets.add("https://models.example.com/kit/tri.gltf");
        assert.equal(record.problems[0]?.code, "E_MODEL_TOO_LARGE");

        serve(new Map([["https://models.example.com/kit/tri.gltf", set.get("tri.gltf") ?? new Uint8Array()]]));
        const missing = await createAssetsApi().add("https://models.example.com/kit/tri.gltf");
        assert.equal(missing.problems[0]?.code, "E_MODEL_MISSING_FILE");
        assert.isAbove((missing.problems[0]?.params.tried as unknown[] | undefined)?.length ?? 0, 0);
    });

    it("loads a GLB, which needs nothing beside it, with one request", async () => {
        const spy = serve(new Map([["https://models.example.com/ball.glb", sphereGlb(8, 4)]]));
        const record = await createAssetsApi().add("https://models.example.com/ball.glb");
        assert.equal(record.state, "accepted");
        assert.lengthOf(spy.mock.calls, 1);
    });
});
