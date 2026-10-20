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

    it("names a part URL that answers with a web page", async () => {
        const part = "https://cdn.example.com/kits/car/colormap-page";
        stubSite({ [main]: POLICE, [part]: utf8("<!doctype html><title>x</title>") });
        const { assets } = gated();
        await assets.ready(main);
        const after = await assets.supply(main, { name: PART, url: part });
        assert.deepInclude(factOf(after, "E_MODEL_WEB_PAGE") ?? {}, { part: PART, host: "cdn.example.com" });
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
