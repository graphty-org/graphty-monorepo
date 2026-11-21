/**
 * @file Version 2 files and the session's own source references (the `source-references`
 * experiment): a save reports why a load cannot be referenced as `session.data.copies()` does, a
 * referenced source an open cannot read is held in the session as a reference and written back as
 * read, and a network source's request history comes back with it, so `data.refresh` replays it.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, credentials, type GraphSession } from "../../../session";
import { elementRefsOf } from "../../../src/session/document2/codecs/dataRefs";
import type { JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2", "source-references"] };
const FRIENDS = "https://example.test/p/friends.csv";
const FRIENDS_CSV = "source,target,w\nAva,Ben,1\nBen,Cara,2\n";
const NETWORK = "https://files.example.com/data/graph.csv";

/**
 * Stub fetch with a site: each URL answers its text, any other a 404.
 * @param site - URL to text.
 */
function stubSite(site: Record<string, string>): void {
    vi.stubGlobal("fetch", (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve(
            body === undefined ? new Response("", { status: 404 }) : new Response(body, { status: 200 }),
        );
    });
}

/**
 * The saved data section's one source that is not the reader's.
 * @param text - The saved text.
 * @returns The record.
 */
function loadedRecord(text: string): JsonObject {
    const { sources } = (JSON.parse(text) as { sections: { data: { sources: JsonObject[] } } }).sections.data;
    return sources.find((each) => each.kind !== "reader") as JsonObject;
}

/**
 * The one load's reason a save asked to reference it gave, and the one `copies()` gives.
 * @param session - A session holding one load.
 * @returns Both reasons.
 */
async function reasonsOf(session: GraphSession): Promise<{ saved: unknown; copies: unknown }> {
    const [{ key }] = session.data.sources();
    const saved = await session.project.save({ format: 2, markSaved: false, embed: { [key]: "referenced" } });
    const fact = saved.report.leftOut.find((each) => each.code === "W_SOURCE_NO_PATH");
    assert.property(loadedRecord(saved.text), "copy", "embedded");
    return { saved: fact?.params.reason, copies: session.data.copies()[0]?.refused?.params.reason };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("a version 2 save asked to reference a load that cannot be one", () => {
    it("names rows handed over inline, as copies() does", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { data: FRIENDS_CSV }, name: "friends.csv" });
        assert.deepEqual(await reasonsOf(session), { saved: "inline", copies: "inline" });
        session.dispose();
    });

    it("names a file the page holds no path to", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        assert.deepEqual(await reasonsOf(session), { saved: "file", copies: "file" });
        session.dispose();
    });

    it("names a URL whose secret query parameter a save drops", async () => {
        const secret = `${FRIENDS}?access_token=hunter2`;
        stubSite({ [secret]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: secret } });
        assert.deepEqual(await reasonsOf(session), { saved: "secret-url", copies: "secret-url" });
        session.dispose();
    });

    it("names a network load read with a credential", async () => {
        stubSite({ [NETWORK]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import(
            { source: "url", config: { url: NETWORK } },
            { credential: credentials.bearer("typed") },
        );
        assert.deepEqual(await reasonsOf(session), { saved: "secret-url", copies: "secret-url" });
        const [source] = (await session.project.describe()).sources.filter((each) => each.kind !== "reader");
        assert.deepEqual(source.refused, {
            code: "W_SOURCE_NO_PATH",
            params: { source: source.id, reason: "secret-url" },
        });
        session.dispose();
    });
});

describe("a load the session keeps as a reference, in a version 2 file", () => {
    it("is saved referenced with no embed option, as session.data.setCopy chose", async () => {
        stubSite({ [FRIENDS]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: FRIENDS } });
        session.data.setCopy(session.data.sources()[0]?.key ?? "", "reference");
        const saved = await session.project.save({ format: 2 });
        assert.notProperty(loadedRecord(saved.text), "copy");
        session.dispose();
    });

    it("opens held as a reference when it cannot be read, is written back as read, and refreshes", async () => {
        stubSite({ [FRIENDS]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: FRIENDS } });
        const [{ key }] = session.data.sources();
        const { text } = await session.project.save({ format: 2, embed: { [key]: "referenced" } });
        const id = String(loadedRecord(text).id);

        stubSite({});
        const opened = createGraphSession(ON);
        const report = await opened.project.open(text, { fetchSources: true });
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "not-found" },
        });
        assert.lengthOf(opened.data.nodes(), 0);
        assert.deepEqual(
            opened.data.sources().map((each) => [each.key, each.copy]),
            [[id, "reference"]],
        );
        assert.deepEqual(opened.data.copies(), [{ source: id, copy: "reference" }]);
        assert.isFalse(opened.project.dirty, "holding it changes nothing");
        const again = await opened.project.save({ format: 2 });
        assert.deepEqual(loadedRecord(again.text), loadedRecord(text), "its record as read");

        stubSite({ [FRIENDS]: FRIENDS_CSV });
        await opened.data.refresh(id);
        assert.deepEqual(
            opened.data.nodes().map((node) => node.id),
            ["Ava", "Ben", "Cara"],
        );
        assert.strictEqual(opened.data.copies()[0]?.copy, "reference");
        assert.notProperty(loadedRecord((await opened.project.save({ format: 2 })).text), "copy");
        session.dispose();
        opened.dispose();
    });
});

describe("a referenced edge list with no edge-id column", () => {
    it("binds a note on one of its edges after the file is rewritten with its rows re-sorted", async () => {
        stubSite({ [FRIENDS]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: FRIENDS } });
        const [{ key }] = session.data.sources();
        const edge = session.data.edges().find((each) => each.source === "Ben");
        session.notes.add({ text: "the second row", targets: [{ edge: String(edge?.id) }] });
        const { text } = await session.project.save({ format: 2, embed: { [key]: "referenced" } });
        const id = String(loadedRecord(text).id);
        const { notes } = (JSON.parse(text) as { sections: { notes: { notes: JsonObject[] } } }).sections.notes;
        assert.deepEqual(notes[0].targets, [{ edge: { load: id, key: "Ben|Cara#1" } }]);

        // The file at the URL is rewritten with the same rows in another order: new bytes, a new copy id.
        stubSite({ [FRIENDS]: "source,target,w\nBen,Cara,2\nAva,Ben,1\n" });
        const opened = createGraphSession(ON);
        const report = await opened.project.open(text, { fetchSources: true });
        // The open holds the changed source until a refresh reads it.
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "copy-changed", size: 37 },
        });
        await opened.data.refresh(id);
        const bound = opened.data.edges().find((each) => each.source === "Ben");
        assert.strictEqual(elementRefsOf(opened).edge({ load: id, key: "Ben|Cara#1" }), bound?.id);

        // Saved after the refresh and opened again, the note binds: its key did not move with the rows.
        const refreshed = await opened.project.save({ format: 2 });
        const again = createGraphSession(ON);
        const reopened = await again.project.open(refreshed.text, { fetchSources: true });
        const codes = reopened.problems.map((problem) => problem.code);
        assert.notInclude(codes, "W_SOURCE_UNAVAILABLE");
        assert.notInclude(codes, "W_REFERENCE_UNBOUND");
        again.dispose();
        session.dispose();
        opened.dispose();
    });
});

describe("a network source in a version 2 file", () => {
    it("keeps its request history, so a refresh after an open replays the request", async () => {
        stubSite({ [NETWORK]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ source: "url", config: { url: NETWORK } });
        const { text } = await session.project.save({ format: 2 });
        const record = loadedRecord(text);
        const ledger = (record.origin as JsonObject).ledger as JsonObject;
        assert.strictEqual(ledger.key, record.id);
        assert.strictEqual(ledger.source, "url");
        assert.deepEqual(ledger.config, { url: NETWORK });

        const opened = createGraphSession(ON);
        await opened.project.open(text);
        assert.deepEqual(
            opened.data.loads().map((each) => each.key),
            [record.id],
        );
        stubSite({ [NETWORK]: `${FRIENDS_CSV}Cara,Dee,3\n` });
        const refreshed = await opened.data.refresh(String(record.id));
        assert.deepEqual(refreshed.added, { nodes: 1, edges: 1 });
        assert.deepEqual(
            opened.data.nodes().map((node) => node.id),
            ["Ava", "Ben", "Cara", "Dee"],
        );
        const again = loadedRecord((await opened.project.save({ format: 2 })).text);
        assert.strictEqual(((again.origin as JsonObject).ledger as JsonObject).key, record.id);
        session.dispose();
        opened.dispose();
    });

    it("saved referenced, opens held and is built by replaying its request on refresh", async () => {
        stubSite({ [NETWORK]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ source: "url", config: { url: NETWORK } });
        const file = JSON.parse((await session.project.save({ format: 2 })).text) as {
            sections: { data: { sources: JsonObject[] } };
        };
        // Another writer may reference a network source: its rows are not in the file.
        const record = file.sections.data.sources.find((each) => each.kind === "network") as JsonObject;
        delete record.copy;
        const id = String(record.id);

        const opened = createGraphSession(ON);
        const report = await opened.project.open(JSON.stringify(file));
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "copy-changed" },
        });
        assert.lengthOf(opened.data.nodes(), 0);
        assert.strictEqual(opened.data.sources()[0]?.copy, "reference");

        await opened.data.refresh(id);
        assert.deepEqual(
            opened.data.nodes().map((node) => node.id),
            ["Ava", "Ben", "Cara"],
        );
        assert.lengthOf(opened.data.edges(), 2);
        session.dispose();
        opened.dispose();
    });
});
