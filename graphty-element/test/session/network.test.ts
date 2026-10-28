/**
 * `session.network` and models fetched by URL (design/rendering/node-models.md sections 2.6 and
 * 3.3): one question per URL, an answer that holds for its host, the page's policy, the hosts the
 * page remembers for a project (never a project file's own say), and a model fetched by URL bringing its own files from beside it.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../session";
import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import {
    createNetworkApi,
    isPrivateHost,
    type NetworkApiInternal,
    type NetworkRequest,
} from "../../src/session/network";
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

    it("stops asking under the page's policy, and allowHosts as code does", async () => {
        const { network, published } = gate();
        const waiting = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        network.setPolicy("allow");
        assert.isTrue(await waiting, "the page's policy releases what waits");
        assert.isTrue(await network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] }));
        network.setPolicy("ask");

        network.allowHosts(["elsewhere.example.org"]);
        assert.isTrue(await network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] }));
        assert.lengthOf(published, 1);
    });

    it("allows the hosts the page remembers for the open project, and only for it", async () => {
        const published: NetworkRequest[] = [];
        let project = "first";
        const network = createNetworkApi(
            (request) => published.push(request),
            undefined,
            () => project,
        );
        const waiting = network.ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        network.setProjectHosts((id) => (id === "first" ? ["Models.Example.com"] : []));
        assert.isTrue(await waiting, "remembered hosts release what waits");
        assert.lengthOf(published, 1);

        project = "second";
        network.projectChanged();
        void network.ask({ url: OTHER, kind: "model", by: "file", layerIds: [] });
        assert.lengthOf(published, 2, "another project asks");

        network.setProjectHosts(() => {
            throw new Error("storage blocked");
        });
        void network.ask({ url: ELSEWHERE, kind: "model", by: "file", layerIds: [] });
        assert.lengthOf(published, 3, "a lookup that fails remembers nothing");
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
        for (const host of [
            "localhost",
            "127.0.0.1",
            "10.0.0.2",
            "192.168.1.4",
            "169.254.0.1",
            "[::1]",
            "nas.local",
            "localhost.",
            "foo.localhost.",
            "printer.local.",
            "127.0.0.1.",
        ]) {
            assert.isTrue(isPrivateHost(host), host);
        }

        assert.isFalse(isPrivateHost("pictures.example.org"));
    });

    it("reads private addresses in every spelling the URL parser leaves, and public ones as public", () => {
        const host = (url: string): string => new URL(url).hostname;
        const privates = [
            "http://198.18.0.1/",
            "http://198.19.255.1/",
            "http://192.0.0.8/",
            "http://224.0.0.1/",
            "http://255.255.255.255/",
            "http://[::127.0.0.1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://[64:ff9b::7f00:1]/",
            "http://[2002:c0a8:0101::]/",
            "http://[ff02::1]/",
            "http://[fec0::1]/",
            "http://[fe80::1]/",
            "http://[fd00::1]/",
        ];
        for (const url of privates) {
            assert.isTrue(isPrivateHost(host(url)), url);
        }

        for (const url of [
            "http://8.8.8.8/",
            "http://[2606:4700::1111]/",
            "http://[64:ff9b::808:808]/",
            "http://[2002:808:808::]/",
        ]) {
            assert.isFalse(isPrivateHost(host(url)), url);
        }
    });

    it("never asks about a host-less address, and never lets an empty host through", async () => {
        const published: NetworkRequest[] = [];
        const network = createNetworkApi((request) => published.push(request));
        const question = { kind: "texture", by: "supplied", layerIds: [] } as const;
        assert.isFalse(await network.ask({ ...question, url: new URL("file:///etc/passwd") }));
        assert.isFalse(await network.ask({ ...question, url: new URL("javascript:alert(1)") }));
        assert.lengthOf(published, 0, "nothing was put to the reader");
        network.allowHosts([""]);
        assert.isFalse(network.allowed(""));
    });

    it("gives a project an id that a save writes and an open reads back", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const { text } = await session.project.save();
        assert.match(session.project.id, /^[0-9a-f]{32}$/);

        const opened = createGraphSession();
        assert.notEqual(opened.project.id, session.project.id, "a new session is a new project");
        await opened.project.open(text);
        assert.equal(opened.project.id, session.project.id);

        const document = JSON.parse(text) as { members: Record<string, unknown>[] };
        delete document.members.find((member) => member.kind === "graphty-session")?.id;
        await opened.project.open(JSON.stringify(document), { discard: true });
        assert.match(opened.project.id, /^[0-9a-f]{32}$/);
        assert.notEqual(opened.project.id, session.project.id, "a file with no id gets a fresh one");
    });
});

describe("a project file cannot approve its own fetches", () => {
    /**
     * A saved project, and the same file as an older release wrote it, carrying `policy: "allow"`.
     * @returns The project's id and the file's text.
     */
    async function savedWithPolicy(): Promise<{ id: string; text: string }> {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const document = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        const state = document.members.find((member) => member.kind === "graphty-session");
        assert.isDefined(state);
        if (state !== undefined) {
            state.network = { policy: "allow" };
        }
        return { id: session.project.id, text: JSON.stringify(document) };
    }

    /**
     * Ask the session's gate about a model URL, as a layer from a file does.
     * @param session - The session.
     * @returns Whether a question was published.
     */
    function asks(session: ReturnType<typeof createGraphSession>): boolean {
        let published = false;
        const stop = session.on("network:pending", () => {
            published = true;
        });
        void (session.network as NetworkApiInternal).ask({ url: RACK, kind: "model", by: "file", layerIds: [] });
        stop();
        return published;
    }

    it("still asks when the file carries policy allow, and says the field was ignored", async () => {
        const { text } = await savedWithPolicy();
        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepInclude(report.problems, { code: "W_NETWORK_POLICY_IGNORED", params: { kind: "graphty-session" } });
        assert.isTrue(asks(opened));
        assert.notInclude((await opened.project.save()).text, '"policy"', "the field is not written back");
    });

    it("skips the question for the project the reader's machine remembers, and only for it", async () => {
        const { id, text } = await savedWithPolicy();
        const machine = new Map([[id, ["models.example.com"]]]);
        const opened = createGraphSession();
        opened.network.setProjectHosts((projectId) => machine.get(projectId) ?? []);
        await opened.project.open(text);
        assert.isFalse(asks(opened), "remembered on this machine");

        const other = createGraphSession();
        await other.data.addNodes([{ id: "b" }]);
        await opened.project.open((await other.project.save()).text, { discard: true });
        assert.isTrue(asks(opened), "another project asks");
    });

    it("asks on another machine, whose preferences are fresh", async () => {
        const { text } = await savedWithPolicy();
        const elsewhere = createGraphSession();
        elsewhere.network.setProjectHosts(() => []);
        await elsewhere.project.open(text);
        assert.isTrue(asks(elsewhere));
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
