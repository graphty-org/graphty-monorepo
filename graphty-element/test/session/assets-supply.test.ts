/**
 * `session.assets.supply` (design/rendering/node-models.md sections 12.4, 12.7 and 12.9): a model
 * missing parts is held, the reader hands each part over by file or URL, skips a picture, or picks
 * a file, and the model is checked again from its main file.
 *
 * The fixture is laid out as a Kenney car kit's GLB: police.glb names its one picture as the
 * separate file Textures/colormap.png.
 */

import { readFileSync } from "node:fs";

import { zipSync } from "fflate";
import { afterEach, assert, describe, it, vi } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { type AssetRecord, createAssetsApi } from "../../src/session/assets/AssetsApi";
import { WHITE_PNG, withSkips } from "../../src/session/assets/textFormats";
import { createNetworkApi, type NetworkRequest } from "../../src/session/network";
import { utf8 } from "../fixtures/models/fixtures";
import { baseSession, sessionWithRuns } from "../helpers/project-session";

const POLICE = new Uint8Array(readFileSync(new URL("../fixtures/models/police.glb", import.meta.url)));
const COLORMAP = new Uint8Array(readFileSync(new URL("../fixtures/models/Textures/colormap.png", import.meta.url)));
const PART = "Textures/colormap.png";
/** Another car of the same kit: its own mesh names, the same one picture. */
const AMBULANCE = ((): Uint8Array => {
    const bytes = POLICE.slice();
    const from = new TextEncoder().encode('"police"');
    const to = new TextEncoder().encode('"ambula"');
    for (let at = 0; at + from.length <= bytes.length; at++) {
        if (from.every((byte, k) => bytes[at + k] === byte)) {
            bytes.set(to, at);
        }
    }

    return bytes;
})();

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
 * A record's fact with a code.
 * @param record - The record.
 * @param code - The code.
 * @returns Its params, or undefined.
 */
function factOf(record: AssetRecord, code: string): Record<string, unknown> | undefined {
    return record.problems.find((p) => p.code === code)?.params;
}

/**
 * Stub fetch with a site: each URL (with its query) answers its bytes, any other a 404.
 * @param site - URL to bytes.
 * @returns The URLs requested, in order.
 */
function stubSite(site: Record<string, Uint8Array>): string[] {
    const log: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
        log.push(url);
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve({
            ok: body !== undefined,
            status: body === undefined ? 404 : 200,
            headers: { get: (name: string) => (name === "content-length" ? String(body?.length ?? 0) : null) },
            body: null,
            arrayBuffer: () => Promise.resolve((body ?? new Uint8Array(0)).slice().buffer),
        });
    });
    return log;
}

/**
 * The assets API behind a gate whose questions are collected.
 * @returns The API, the gate and the questions it published.
 */
function gated(): {
    assets: ReturnType<typeof createAssetsApi>;
    network: ReturnType<typeof createNetworkApi>;
    asked: NetworkRequest[];
} {
    const asked: NetworkRequest[] = [];
    const network = createNetworkApi((request) => asked.push(request));
    return { assets: createAssetsApi(network), network, asked };
}

/**
 * Resolve once a condition holds, checking after each pending job.
 * @param condition - The condition.
 */
async function until(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 1000 && !condition(); i++) {
        await Promise.resolve();
        await new Promise((resolve) => setImmediate(resolve));
    }

    assert.isTrue(condition(), "the condition held");
}

describe("assets.supply: a picture by file", () => {
    it("holds police.glb with its one missing picture, then takes colormap.png by its base name", async () => {
        const assets = createAssetsApi();
        const rejected = await assets.add(file(POLICE, "police.glb"));
        assert.strictEqual(rejected.state, "rejected");
        assert.deepStrictEqual(
            rejected.problems.map((p) => [p.code, p.params.name, p.params.role, p.params.optional]),
            [["E_MODEL_MISSING_FILE", PART, "texture", true]],
        );

        const accepted = await assets.supply(rejected.id, { file: file(COLORMAP, "colormap.png") });
        assert.strictEqual(accepted.state, "accepted", JSON.stringify(accepted.problems));
        assert.strictEqual(accepted.id, `asset:${accepted.digest}`);
        assert.notStrictEqual(accepted.id, rejected.id, "the digest covers the supplied part");
        assert.deepStrictEqual([...assets.files(accepted.id).keys()].sort(), [PART, "police.glb"]);
        // The id the layer named while it was rejected reaches the accepted model.
        assert.strictEqual((await assets.ready(rejected.id)).id, accepted.id);
        assert.strictEqual(assets.inspect(accepted.id).textures, 1);
    });

    it("gives the same id as the folder and the zip holding the same files", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const supplied = await assets.supply(held.id, { name: PART, file: COLORMAP });
        const folder = await createAssetsApi().add({
            files: new Map([
                ["car-kit/police.glb", POLICE],
                [`car-kit/${PART}`, COLORMAP],
            ]),
        });
        const zipped = await createAssetsApi().add(
            file(zipSync({ "kit/police.glb": POLICE, [`kit/${PART}`]: COLORMAP }), "kit.zip"),
        );
        assert.strictEqual(supplied.state, "accepted", JSON.stringify(supplied.problems));
        assert.strictEqual(folder.id, supplied.id);
        assert.strictEqual(zipped.id, supplied.id);
    });

    it("leaves the model as it was for a file no missing part has, with W_MODEL_PART_UNUSED", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const after = await assets.supply(held.id, { file: file(COLORMAP, "wood.png") });
        assert.strictEqual(after.state, "rejected");
        assert.deepStrictEqual(factOf(after, "W_MODEL_PART_UNUSED"), { fileName: "wood.png" });
        assert.strictEqual(factOf(after, "E_MODEL_MISSING_FILE")?.name, PART);
        assert.strictEqual((await assets.supply(held.id, { file: file(COLORMAP, "COLORMAP.PNG") })).state, "accepted");
    });

    it("keeps the row when the file is not a picture, and says why", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const after = await assets.supply(held.id, { name: PART, file: utf8("not a picture") });
        assert.strictEqual(after.state, "rejected");
        assert.strictEqual(after.problems[0]?.code, "E_MODEL_STRUCTURE", JSON.stringify(after.problems));
        assert.strictEqual(after.problems[0]?.params.part, PART, "the refusal names the part it was for");
        assert.strictEqual(factOf(after, "E_MODEL_MISSING_FILE")?.name, PART);
        assert.strictEqual((await assets.supply(held.id, { name: PART, file: COLORMAP })).state, "accepted");
    });

    it("throws for a ref it does not hold and for a model that is not missing anything", async () => {
        const assets = createAssetsApi();
        const unknown = await assets.supply("asset:nothing", { name: PART, skip: true }).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(unknown) && unknown.code === "E_MODEL_UNKNOWN_ASSET", String(unknown));
        const held = await assets.add(file(POLICE, "police.glb"));
        const done = await assets.supply(held.id, { file: file(COLORMAP, "colormap.png") });
        const again = await assets.supply(done.id, { name: PART, skip: true }).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(again) && again.code === "E_BAD_COMMAND", String(again));
    });

    it("runs calls for one model one at a time, in order", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const [first, second] = await Promise.all([
            assets.supply(held.id, { file: file(COLORMAP, "colormap.png") }),
            assets.supply(held.id, { name: PART, skip: true }).catch((e: unknown) => e),
        ]);
        assert.strictEqual(first.state, "accepted");
        assert.isTrue(isGraphtyError(second) && second.code === "E_BAD_COMMAND", "the second saw it accepted");
    });
});

describe("assets.supply: the model's name and ids while it waits and once it is drawn", () => {
    it("names a waiting model by its main file, and finds it by the id it had while waiting", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        assert.strictEqual(held.path, "police.glb");
        assert.strictEqual(assets.find(held.id)?.path, "police.glb");
        const accepted = await assets.supply(held.id, { file: file(COLORMAP, "colormap.png") });
        assert.notStrictEqual(accepted.id, held.id);
        assert.strictEqual(assets.find(held.id)?.id, accepted.id, "the waiting id finds the drawn model");
        assert.strictEqual(assets.find(held.id)?.path, "police.glb");
    });

    it("gives the finished model for the same main file added again, not a name taken", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const accepted = await assets.supply(held.id, { file: file(COLORMAP, "colormap.png") });
        const again = await assets.add(file(POLICE, "police.glb"));
        assert.strictEqual(again.state, "accepted", JSON.stringify(again.problems));
        assert.strictEqual(again.id, accepted.id);
    });

    it("draws a second model of a kit with the picture the session already holds, asking nothing", async () => {
        const assets = createAssetsApi();
        const police = await assets.add(file(POLICE, "police.glb"));
        await assets.supply(police.id, { file: file(COLORMAP, "colormap.png") });
        const ambulance = await assets.add(file(AMBULANCE, "ambulance.glb"));
        assert.strictEqual(ambulance.state, "accepted", JSON.stringify(ambulance.problems));
        assert.isUndefined(factOf(ambulance, "W_MODEL_PART_SUBSTITUTED"), "matched by its whole path");
        assert.lengthOf(assets.waiting(), 0);
    });

    it("takes a picture added on its own by its base name, and says it was substituted", async () => {
        const assets = createAssetsApi();
        await assets.add(file(COLORMAP, "colormap.png"));
        const police = await assets.add(file(POLICE, "police.glb"));
        assert.strictEqual(police.state, "accepted", JSON.stringify(police.problems));
        assert.deepStrictEqual(factOf(police, "W_MODEL_PART_SUBSTITUTED"), { name: PART, used: "colormap.png" });
    });

    it("guesses nothing when two different pictures in the session could be the part", async () => {
        const assets = createAssetsApi();
        await assets.add({ files: new Map([["a/colormap.png", COLORMAP]]) });
        await assets.add({ files: new Map([["colormap.png", WHITE_PNG]]) });
        const police = await assets.add(file(POLICE, "police.glb"));
        assert.strictEqual(police.state, "rejected");
        assert.strictEqual(factOf(police, "E_MODEL_MISSING_FILE")?.name, PART);
    });

    it("saves a layer naming the waiting id under the drawn model's id, and the reopened project draws it", async () => {
        const session = await baseSession();
        const held = await session.assets.add(file(POLICE, "police.glb"));
        await session.styles.add({
            name: "police",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": held.id },
        });
        const accepted = await session.assets.supply(held.id, { file: file(COLORMAP, "colormap.png") });
        const saved = await session.project.save();
        assert.notInclude(saved.text, held.id, "the file names only the id it embeds");

        const reopened = sessionWithRuns();
        await reopened.project.open(saved.text);
        const [layer] = reopened.styles.list().filter((each) => each.name === "police");
        assert.strictEqual(layer.set?.["node.model"], accepted.id);
        assert.strictEqual((await reopened.assets.ready(accepted.id)).state, "accepted");
    });
});

describe("assets.supply: skipping a part", () => {
    it("draws without a skipped picture, listed on the record and out of the digest", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const skipped = await assets.supply(held.id, { name: PART, skip: true });
        assert.strictEqual(skipped.state, "accepted", JSON.stringify(skipped.problems));
        assert.deepStrictEqual(skipped.skipped, [PART]);
        assert.deepStrictEqual(factOf(skipped, "W_MODEL_PART_SKIPPED"), { name: PART, role: "texture" });
        assert.deepStrictEqual([...assets.files(skipped.id).keys()], ["police.glb"]);
        assert.strictEqual(skipped.id, held.id, "the digest of police.glb alone");
    });

    it("draws an OBJ without a skipped picture: its MTL line is dropped and nothing stands in", async () => {
        const assets = createAssetsApi();
        const held = await assets.add({
            files: new Map([
                ["quad.obj", utf8("mtllib quad.mtl\nv 0 0 0\nv 1 0 0\nv 1 1 0\nusemtl m\nf 1 2 3\n")],
                ["quad.mtl", utf8("newmtl m\nKd 1 0 0\nmap_Kd -s 1 1 1 maps\\Wood.png\n")],
            ]),
        });
        assert.strictEqual(factOf(held, "E_MODEL_MISSING_FILE")?.name, "maps/Wood.png");
        const skipped = await assets.supply(held.id, { name: "maps/Wood.png", skip: true });
        assert.strictEqual(skipped.state, "accepted", JSON.stringify(skipped.problems));
        const drawn = withSkips(assets.files(skipped.id), skipped.skipped ?? [], true);
        assert.strictEqual(new TextDecoder().decode(drawn.get("quad.mtl")), "newmtl m\nKd 1 0 0\n");
        assert.deepStrictEqual(drawn.get("maps/Wood.png"), WHITE_PNG);
    });

    it("refuses to skip geometry with E_MODEL_PART_REQUIRED", async () => {
        const assets = createAssetsApi();
        const held = await assets.add(file(POLICE, "police.glb"));
        const error = await assets.supply(held.id, { name: "police.bin", skip: true }).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(error) && error.code === "E_MODEL_PART_REQUIRED", String(error));
        assert.deepInclude(isGraphtyError(error) ? error.details : {}, { name: "police.bin", role: "geometry" });
        assert.strictEqual(assets.get(held.id)?.state, "rejected", "nothing changed");
    });
});

describe("assets.supply: a part by URL", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const main = "https://cdn.example.com/kits/car/police.glb?sig=main";

    it("fetches a part on the main file's origin at once, query kept for the fetch only", async () => {
        const part = "https://cdn.example.com/elsewhere/colormap.png?sig=part";
        const log = stubSite({ [main]: POLICE, [part]: COLORMAP });
        const { assets, asked } = gated();
        const held = await assets.ready(main);
        assert.strictEqual(held.state, "rejected");
        assert.strictEqual(factOf(held, "E_MODEL_MISSING_FILE")?.name, PART);

        const accepted = await assets.supply(main, { name: PART, url: part });
        assert.strictEqual(accepted.state, "accepted", JSON.stringify(accepted.problems));
        assert.include(log, part, "the query went with the fetch");
        assert.lengthOf(asked, 0, "the same origin asks nothing");
        assert.notInclude(JSON.stringify(accepted), "sig=part", "no part query in the record");
        assert.strictEqual(assets.urlRecord(main)?.id, accepted.id, "the URL the layer named resolves to it");
    });

    it("asks for a part on another host as W_URL_NEEDS_APPROVAL, by supplied; deny blocks it", async () => {
        const part = "https://pictures.example.org/colormap.png?token=secret";
        const log = stubSite({ [main]: POLICE, [part]: COLORMAP });
        const { assets, network, asked } = gated();
        await assets.ready(main);
        const answer = assets.supply(main, { name: PART, url: part });
        await until(() => asked.length === 1);
        assert.deepInclude(asked[0].params, {
            url: "https://pictures.example.org/colormap.png",
            host: "pictures.example.org",
            kind: "texture",
            by: "supplied",
        });
        assert.notInclude(JSON.stringify(network.pending()), "secret");
        network.deny(asked[0].params.id);
        const denied = await answer;
        assert.strictEqual(denied.state, "rejected");
        assert.deepStrictEqual(factOf(denied, "E_MODEL_URL_BLOCKED"), {
            hosts: ["pictures.example.org"],
            denied: true,
            part: PART,
        });
        assert.strictEqual(factOf(denied, "E_MODEL_MISSING_FILE")?.name, PART, "the row stays");
        assert.notInclude(log, part, "nothing was fetched");

        const again = assets.supply(main, { name: PART, url: part });
        await until(() => asked.length === 2);
        await network.allow(asked[1].params.id);
        assert.strictEqual((await again).state, "accepted");
    });

    it("refuses a private host whoever asks, even when the page allows everything", async () => {
        const part = "http://127.0.0.1:9000/colormap.png";
        const log = stubSite({ [main]: POLICE, [part]: COLORMAP });
        const { assets, network } = gated();
        network.setPolicy("allow");
        await assets.ready(main);
        const after = await assets.supply(main, { name: PART, url: part });
        assert.deepStrictEqual(factOf(after, "E_MODEL_URL_BLOCKED"), { hosts: ["127.0.0.1:9000"], part: PART });
        assert.notInclude(log, part);
    });

    it("refuses a part address that is not a web address before asking anyone", async () => {
        stubSite({ [main]: POLICE });
        const { assets, network, asked } = gated();
        await assets.ready(main);
        for (const url of ["file:///etc/passwd", "javascript:alert(1)"]) {
            const after = await assets.supply(main, { name: PART, url });
            assert.strictEqual(factOf(after, "E_MODEL_URL_BLOCKED")?.scheme, new URL(url).protocol, url);
        }
        assert.lengthOf(asked, 0);
        assert.isFalse(network.allowed(""));
        const login = await assets.supply(main, { name: PART, url: "https://me:pw@pictures.example.org/c.png" });
        assert.isTrue(factOf(login, "E_MODEL_URL_BLOCKED")?.credentials === true);
        assert.lengthOf(asked, 0);
    });

    it("does not hold a file back behind a part address waiting for the reader's answer", async () => {
        const part = "https://pictures.example.org/colormap.png";
        stubSite({ [main]: POLICE, [part]: COLORMAP });
        const { assets, network, asked } = gated();
        await assets.ready(main);
        const byUrl = assets.supply(main, { name: PART, url: part });
        await until(() => asked.length === 1);
        const offered = await assets.offer([file(COLORMAP, "colormap.png")]);
        assert.lengthOf(offered.supplied, 1, "the file went in while the question waited");
        assert.strictEqual(assets.urlRecord(main)?.state, "accepted");
        network.deny(asked[0].params.id);
        await byUrl.catch(() => undefined);
    });

    it("says a GitHub blob page given for a part is a web page, asking and fetching nothing", async () => {
        const page = "https://github.com/kenney/car-kit/blob/main/Textures/colormap.png";
        const log = stubSite({ [main]: POLICE });
        const { assets, asked } = gated();
        await assets.ready(main);
        const after = await assets.supply(main, { name: PART, url: page });
        assert.deepInclude(factOf(after, "E_MODEL_WEB_PAGE") ?? {}, {
            part: PART,
            suggested: "https://raw.githubusercontent.com/kenney/car-kit/main/Textures/colormap.png",
        });
        assert.lengthOf(asked, 0);
        assert.notInclude(log, page);
    });

    it("names a part URL that answers with a web page", async () => {
        const part = "https://cdn.example.com/kits/car/colormap-page";
        stubSite({ [main]: POLICE, [part]: utf8("<!doctype html><title>x</title>") });
        const { assets } = gated();
        await assets.ready(main);
        const after = await assets.supply(main, { name: PART, url: part });
        assert.deepInclude(factOf(after, "E_MODEL_WEB_PAGE") ?? {}, { part: PART, host: "cdn.example.com" });
    });
});

describe("a fetch redirected to another address (design 2.6)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /**
     * Stub fetch with one redirect: `from` answers as `to` did, marked redirected.
     * @param from - The address asked for.
     * @param to - Where it was sent.
     * @param bytes - What `to` answers.
     * @returns The URLs requested, and the bodies read.
     */
    function stubRedirect(from: string, to: string, bytes: Uint8Array): { log: string[]; read: string[] } {
        const log: string[] = [];
        const read: string[] = [];
        vi.stubGlobal("fetch", (url: string) => {
            log.push(url);
            const sent = url === from ? to : url;
            return Promise.resolve({
                ok: sent === to,
                status: sent === to ? 200 : 404,
                redirected: url === from,
                url: sent,
                headers: { get: () => null },
                body: null,
                arrayBuffer: () => {
                    read.push(sent);
                    return Promise.resolve(bytes.slice().buffer);
                },
            });
        });
        return { log, read };
    }

    it("never reads an answer from a private address a public one was sent on to", async () => {
        const from = "https://models.example.com/redirect-to?url=http://127.0.0.1:9064/car.glb";
        const { read } = stubRedirect(from, "http://127.0.0.1:9064/car.glb", POLICE);
        const { assets, network } = gated();
        network.setPolicy("allow");
        const record = await assets.ready(from);
        assert.deepStrictEqual(factOf(record, "E_MODEL_URL_BLOCKED"), { hosts: ["127.0.0.1:9064"], redirected: true });
        assert.lengthOf(read, 0, "nothing from the private address was read");
    });

    it("asks again for the host a reader-approved fetch was sent on to, and reads nothing when denied", async () => {
        const from = "https://models.example.com/car.glb";
        const to = "https://elsewhere.example.net/car.glb";
        const { read } = stubRedirect(from, to, POLICE);
        const { assets, network, asked } = gated();
        const first = network.ask({ url: new URL(from), kind: "model", by: "file", layerIds: [] });
        await until(() => asked.length === 1);
        await network.allow(asked[0].params.id);
        assert.isTrue(await first);
        const record = assets.ready(from);
        await until(() => asked.length === 2);
        assert.deepInclude(asked[1].params, { host: "elsewhere.example.net", kind: "model" });
        network.deny(asked[1].params.id);
        assert.deepInclude(factOf(await record, "E_MODEL_URL_BLOCKED") ?? {}, { redirected: true, denied: true });
        assert.lengthOf(read, 0);
    });

    it("refuses a part's redirect to a private address", async () => {
        const part = "https://cdn.example.com/redirect?to=lan";
        const main = "https://cdn.example.com/kits/car/police.glb";
        vi.stubGlobal("fetch", (url: string) =>
            Promise.resolve({
                ok: url === part || url === main,
                status: url === part || url === main ? 200 : 404,
                redirected: url === part,
                url: url === part ? "http://192.168.1.4/colormap.png" : url,
                headers: { get: () => null },
                body: null,
                arrayBuffer: () => Promise.resolve((url === part ? COLORMAP : POLICE).slice().buffer),
            }),
        );
        const { assets } = gated();
        await assets.ready(main);
        const after = await assets.supply(main, { name: PART, url: part });
        assert.deepInclude(factOf(after, "E_MODEL_URL_BLOCKED") ?? {}, { hosts: ["192.168.1.4"], redirected: true });
        assert.strictEqual(after.state, "rejected");
    });
});

describe("assets.supply: saving and reopening", () => {
    it("saves the skip, and the reopened model is the same asset and asks nothing", async () => {
        const session = await baseSession();
        const held = await session.assets.add(file(POLICE, "police.glb"));
        const skipped = await session.assets.supply(held.id, { name: PART, skip: true });
        await session.styles.add({
            name: "police",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": held.id },
        });
        const saved = await session.project.save();
        const document = JSON.parse(saved.text) as { members: { kind: string; assets?: { skipped?: string[] }[] }[] };
        const member = document.members.find((each) => each.kind === "graphty-assets");
        assert.deepStrictEqual(member?.assets?.[0]?.skipped, [PART]);

        const reopened = sessionWithRuns();
        await reopened.project.open(saved.text);
        const record = reopened.assets.get(skipped.id);
        assert.strictEqual(record?.state, "accepted", JSON.stringify(record?.problems));
        assert.deepStrictEqual(record?.skipped, [PART]);
        assert.lengthOf(reopened.network.pending(), 0);
    });

    it("embeds a URL model whose parts were supplied, never writing a part's URL", async () => {
        const main = "https://cdn.example.com/kits/car/police.glb?sig=main";
        const part = "https://cdn.example.com/elsewhere/colormap.png?sig=part";
        stubSite({ [main]: POLICE, [part]: COLORMAP });
        try {
            const session = await baseSession();
            await session.assets.ready(main);
            await session.assets.supply(main, { name: PART, url: part });
            await session.styles.add({
                name: "police",
                target: "node",
                selector: { match: "everything" },
                set: { "node.model": main },
            });
            const saved = await session.project.save({ assets: { [main]: "url" } });
            assert.notInclude(saved.text, "elsewhere");
            assert.notInclude(saved.text, "sig=part");
            const document = JSON.parse(saved.text) as {
                members: { kind: string; assets?: { stored?: string; files?: unknown[] }[] }[];
            };
            const entry = document.members.find((each) => each.kind === "graphty-assets")?.assets?.[0];
            assert.isUndefined(entry?.stored);
            assert.lengthOf(entry?.files ?? [], 2);
            assert.deepInclude(saved.report.leftOut, {
                code: "W_MODEL_NOT_KEPT_BY_URL",
                params: { url: "https://cdn.example.com/kits/car/police.glb", reason: "parts" },
            });
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
