/**
 * `project.assetChoices()`: the models and pictures a layer names by URL that a save can embed or
 * keep by URL, what a save without a choice does with each, and that, with the node-models
 * experiment on, the choice a file was opened with, or the last written save was given, carries
 * over to the next save of that project -- but never to autosave.
 *
 * The fixture is laid out as a Kenney car kit's GLB: police.glb names its one picture as the
 * separate file Textures/colormap.png.
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { buildParts } from "../../src/autosave/parts";
import type { GraphSession } from "../../src/session/types";
import { sphereGlb } from "../fixtures/models/fixtures";
import { baseSession, sessionWithRuns } from "../helpers/project-session";

const POLICE = new Uint8Array(readFileSync(new URL("../fixtures/models/police.glb", import.meta.url)));
const COLORMAP = new Uint8Array(readFileSync(new URL("../fixtures/models/Textures/colormap.png", import.meta.url)));
const PART = "Textures/colormap.png";
const BALL = "https://models.example.com/ball.glb";
const PICTURE = "https://models.example.com/colormap.png";

/** One entry of a saved file's `graphty-assets` member. */
interface Entry {
    readonly id: string;
    readonly source?: string;
    readonly stored?: string;
    readonly files?: unknown[];
}

/**
 * Stub fetch with a site: each URL answers its bytes, any other a 404.
 * @param site - URL to bytes.
 */
function stubSite(site: Record<string, Uint8Array>): void {
    vi.stubGlobal("fetch", (url: string) => {
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve({
            ok: body !== undefined,
            status: body === undefined ? 404 : 200,
            headers: { get: (name: string) => (name === "content-length" ? String(body?.length ?? 0) : null) },
            body: null,
            arrayBuffer: () => Promise.resolve((body ?? new Uint8Array(0)).slice().buffer),
        });
    });
}

/**
 * The entries of a saved file's assets member.
 * @param text - The file.
 * @returns Its entries, or none.
 */
function entriesOf(text: string): Entry[] {
    const document = JSON.parse(text) as { members: { kind: string; assets?: Entry[] }[] };
    return document.members.find((member) => member.kind === "graphty-assets")?.assets ?? [];
}

/**
 * Add a node layer that sets one channel.
 * @param session - The session.
 * @param name - The layer's name.
 * @param set - What it sets.
 * @returns The layer's id.
 */
async function layer(session: GraphSession, name: string, set: Record<string, unknown>): Promise<string> {
    await session.styles.add({ name, target: "node", selector: { match: "everything" }, set });
    const added = session.styles.list().find((each) => each.name === name);
    assert.isDefined(added);
    return added.id;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("project.assetChoices", () => {
    it("lists each accepted model and picture a layer names by URL, embedded by default", async () => {
        const ball = sphereGlb(8, 4);
        stubSite({ [BALL]: ball, [PICTURE]: COLORMAP });
        const session = await baseSession();
        const modelLayer = await layer(session, "ball", { "node.model": BALL });
        const pictureLayer = await layer(session, "picture", { "node.texture": PICTURE });
        const model = await session.assets.ready(BALL);
        const picture = await session.assets.ready(PICTURE);
        assert.strictEqual(model.state, "accepted", JSON.stringify(model.problems));
        assert.strictEqual(picture.state, "accepted", JSON.stringify(picture.problems));

        assert.deepStrictEqual(session.project.assetChoices(), [
            {
                url: BALL,
                id: model.id,
                kind: "model",
                byteLength: ball.length,
                layerIds: [modelLayer],
                storage: "embed",
            },
            {
                url: PICTURE,
                id: picture.id,
                kind: "image",
                byteLength: COLORMAP.length,
                layerIds: [pictureLayer],
                storage: "embed",
            },
        ]);
    });

    it("leaves out samples and models added from files", async () => {
        const session = await baseSession();
        const added = await session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        assert.strictEqual(added.state, "accepted");
        await layer(session, "file", { "node.model": added.id });
        await layer(session, "sample", { "node.model": "asset:sample/box" });
        assert.deepStrictEqual(session.project.assetChoices(), []);
    });

    it("refuses to keep by URL a model whose parts were supplied from elsewhere", async () => {
        const main = "https://cdn.example.com/kits/car/police.glb";
        const part = "https://cdn.example.com/elsewhere/colormap.png";
        stubSite({ [main]: POLICE, [part]: COLORMAP });
        const session = await baseSession();
        await session.assets.ready(main);
        await session.assets.supply(main, { name: PART, url: part });
        await layer(session, "police", { "node.model": main });

        const [choice] = session.project.assetChoices();
        assert.strictEqual(choice.url, main);
        assert.strictEqual(choice.storage, "embed");
        assert.deepStrictEqual(choice.urlRefused, {
            code: "W_MODEL_NOT_KEPT_BY_URL",
            params: { url: main, reason: "parts" },
        });
    });

    it("embeds a URL an opened file kept by URL, on a save with no choice, with node-models off", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4) });
        const session = await baseSession([]);
        await layer(session, "ball", { "node.model": BALL });
        await session.assets.ready(BALL);
        const saved = await session.project.save({ assets: { [BALL]: "url" } });
        assert.strictEqual(entriesOf(saved.text)[0].stored, "url");

        const opened = sessionWithRuns([]);
        await opened.project.open(saved.text);
        assert.strictEqual((await opened.assets.ready(BALL)).state, "accepted");
        assert.strictEqual(opened.project.assetChoices()[0].storage, "embed");
        const [entry] = entriesOf((await opened.project.save()).text);
        assert.isUndefined(entry.stored);
        assert.isDefined(entry.files, "embedded, as before the experiment");
    });

    it("keeps a URL the way the opened file kept it, on the next save with no choice", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4) });
        const session = await baseSession(["node-models"]);
        await layer(session, "ball", { "node.model": BALL });
        await session.assets.ready(BALL);
        const saved = await session.project.save({ assets: { [BALL]: "url" } });
        assert.strictEqual(entriesOf(saved.text)[0].stored, "url");

        const opened = sessionWithRuns(["node-models"]);
        await opened.project.open(saved.text);
        assert.strictEqual((await opened.assets.ready(BALL)).state, "accepted");
        assert.strictEqual(opened.project.assetChoices()[0].storage, "url");

        const [entry] = entriesOf((await opened.project.save()).text);
        assert.strictEqual(entry.stored, "url");
        assert.isUndefined(entry.files, "nothing is embedded");

        // The last save's choice holds too: told to embed, the next save embeds.
        await opened.project.save({ assets: { [BALL]: "embed" } });
        assert.strictEqual(opened.project.assetChoices()[0].storage, "embed");
        assert.isDefined(entriesOf((await opened.project.save()).text)[0].files);
    });

    it("remembers a copy's or an unwritten save's choice only once it is marked saved", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4) });
        const session = await baseSession(["node-models"]);
        await layer(session, "ball", { "node.model": BALL });
        await session.assets.ready(BALL);
        const copy = await session.project.save({ assets: { [BALL]: "url" }, markSaved: false });
        assert.strictEqual(session.project.assetChoices()[0].storage, "embed", "a copy changes nothing");

        session.project.markSaved(copy);
        assert.strictEqual(session.project.assetChoices()[0].storage, "url");
    });

    it("forgets how the last project kept a URL when another project opens in its place", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4) });
        const session = await baseSession(["node-models"]);
        await layer(session, "ball", { "node.model": BALL });
        await session.assets.ready(BALL);
        await session.project.save({ assets: { [BALL]: "url" } });
        assert.strictEqual(session.project.assetChoices()[0].storage, "url");

        const other = await baseSession();
        await session.project.open((await other.project.save()).text);
        await layer(session, "ball", { "node.model": BALL });
        assert.strictEqual(session.project.assetChoices()[0].storage, "embed");
    });

    it("never lets autosave keep a model by URL", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4) });
        const session = await baseSession(["node-models"]);
        await layer(session, "ball", { "node.model": BALL });
        await session.assets.ready(BALL);
        await session.project.save({ assets: { [BALL]: "url" } });
        assert.strictEqual(session.project.assetChoices()[0].storage, "url");

        const { parts } = buildParts(session, new Set(["rest"] as const), new Map(), new Map());
        assert.lengthOf(
            Object.keys(parts).filter((name) => name.startsWith("asset:")),
            1,
            "the model's files are a part of their own",
        );
        assert.notInclude(parts.rest ?? "", '"stored"');
    });
});

describe("assets.usedBy", () => {
    it("lists the layers naming an asset by its id, its waiting id or its URL, on either channel", async () => {
        stubSite({ [BALL]: sphereGlb(8, 4), [PICTURE]: COLORMAP });
        const session = await baseSession();
        const held = await session.assets.add({ files: new Map([["police.glb", POLICE]]) });
        assert.isTrue(session.assets.waiting().some((each) => each.id === held.id));
        const waitingLayer = await layer(session, "police", { "node.model": held.id });
        const accepted = await session.assets.supply(held.id, { name: PART, file: COLORMAP });
        assert.strictEqual(accepted.state, "accepted");
        assert.deepStrictEqual(session.assets.usedBy(accepted.id), [waitingLayer], "by the id it had while waiting");
        assert.deepStrictEqual(session.assets.usedBy(held.id), [waitingLayer]);

        const pictureLayer = await layer(session, "picture", { "node.texture": PICTURE });
        const picture = await session.assets.ready(PICTURE);
        assert.deepStrictEqual(session.assets.usedBy(picture.id), [pictureLayer], "by its URL");
        assert.deepStrictEqual(session.assets.usedBy(BALL), []);
    });
});
