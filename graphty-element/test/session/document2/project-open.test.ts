/**
 * @file Version 2 project opens and saves through `project.open` and `project.save`, behind the
 * `save-files-v2` experiment: a data section that cannot be built, or is held, still opens a
 * project and holds what is bound to it; the document state is forgotten at every project
 * boundary; a partial save is a copy; the save options a version 1 file cannot hold are refused;
 * and a source saved by reference is read again from its URL on open.
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import { rebasedPath } from "../../../src/session/document2/codecs/dataRefs";
import type { ProjectFileHandle } from "../../../src/session/document2/codecs/fileHandles";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import { finishAtOnce } from "../runs/harness";

const SPEC = new URL("../../../spec/", import.meta.url);
const readText = (path: string): string => readFileSync(new URL(path, SPEC), "utf8");
const readJson = (path: string): JsonObject => JSON.parse(readText(path)) as JsonObject;
const ON = { features: ["save-files-v2"] };
const DATA_ID = "d1a7c0de-0001-4000-8000-000000000001";

const codes = (problems: readonly { code: string }[]): string[] => problems.map((problem) => problem.code);

/**
 * The error a rejection carries.
 * @param promise - What should reject.
 * @returns Its code and details.
 */
async function refusal(promise: Promise<unknown>): Promise<{ code: string; details?: Record<string, unknown> }> {
    try {
        await promise;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return error as { code: string; details?: Record<string, unknown> };
    }

    throw new Error("expected a rejection");
}

/**
 * A session holding a small project of its own: two nodes and an edge.
 * @returns The session.
 */
async function ownProject(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.import({ type: "csv", config: { data: "source,target,w\nP,Q,1\n" }, name: "own.csv" });
    return session;
}

/**
 * The card-fraud example with its data section changed.
 * @param change - Changes the data section in place.
 * @returns The file's text.
 */
function exampleWith(change: (data: JsonObject) => void): string {
    const file = readJson("examples/card-fraud.graphty.json");
    change((file.sections as Record<string, JsonObject>).data);
    return JSON.stringify(file);
}

/**
 * The sections of a version 2 full file.
 * @param text - The file.
 * @returns Its sections.
 */
const sectionsOf = (text: string): Record<string, JsonObject> =>
    (JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>;

describe("a project whose data section cannot be loaded", () => {
    for (const [what, change] of [
        [
            "a data section this reader cannot build",
            (data: JsonObject) => ((data.joins as JsonObject[])[0].op = "join.link"),
        ],
        ["a newer data section", (data: JsonObject) => (data.version = 3)],
    ] as const) {
        it(`opens ${what} as a project, clears the old data and holds the sections bound to it`, async () => {
            const session = await ownProject();
            const text = exampleWith(change);
            const report = await session.project.open(text, { discard: true, rerun: false });
            assert.strictEqual(report.opened, "project");
            // The old project's data does not stay under the new project's name.
            assert.lengthOf(session.data.nodes(), 0);
            const kept = report.problems.filter((problem) => problem.code === "W_SECTION_KEPT");
            assert.includeMembers(
                kept.map((problem) => problem.params.section),
                ["data", "results", "notes", "view"],
            );
            assert.notInclude(codes(report.problems), "W_DATA_MISMATCH");

            // Held sections are written back as read, never the session's own of their kind.
            const read = sectionsOf(text);
            const saved = sectionsOf((await session.project.save({ format: 2, results: true })).text);
            for (const name of ["data", "results", "notes", "view"]) {
                assert.deepEqual(saved[name], read[name], name);
            }

            session.dispose();
        });
    }
});

describe("the document state", () => {
    it("is forgotten at a project boundary, but for the data id a replacing import keeps", async () => {
        const session = createGraphSession(ON);
        const newer = { ...readJson("examples/card-fraud.graphty-style.json"), version: 9 };
        const file = readJson("examples/card-fraud.graphty.json");
        (file.sections as Record<string, JsonObject>).style = newer;
        await session.project.open(JSON.stringify(file), { rerun: false });
        const before = sectionsOf((await session.project.save({ format: 2 })).text);
        assert.strictEqual(before.style.version, 9);
        assert.strictEqual(before.data.id, DATA_ID);

        await session.data.import({ type: "csv", config: { data: "source,target\nP,Q\n" }, name: "next.csv" });
        const after = await session.project.save({ format: 2 });
        const sections = sectionsOf(after.text);
        assert.strictEqual(sections.style.version, 2);
        // A replace keeps the data id (spec 3.3).
        assert.strictEqual(sections.data.id, DATA_ID);
        assert.notInclude(codes(after.report.leftOut), "W_SECTION_KEPT");

        // So a notes section saved on the first data binds, by key, to what the new data holds.
        const notes = await session.project.open(readText("examples/card-fraud.graphty-notes.json"));
        assert.notInclude(codes(notes.problems), "W_DATA_MISMATCH");
        assert.include(codes(notes.problems), "W_REFERENCE_UNBOUND");
        session.dispose();
    });

    it("keeps the wrapper's extensions read on open under the caller's", async () => {
        const session = createGraphSession(ON);
        const file = { ...readJson("examples/card-fraud.graphty.json"), extensions: { "org.example.lab": { a: 1 } } };
        await session.project.open(JSON.stringify(file), { rerun: false });
        const saved = JSON.parse(
            (await session.project.save({ format: 2, extensions: { "com.example.app": { b: 2 } } })).text,
        ) as JsonObject;
        assert.deepEqual(saved.extensions, { "org.example.lab": { a: 1 }, "com.example.app": { b: 2 } });
        session.dispose();
    });
});

describe("record keys after a round trip", () => {
    it("writes each node's record key, so the notes bind after the data changed", async () => {
        const session = createGraphSession(ON);
        await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        // A change, so the data section is written from the session rather than as read.
        await session.data.addNodes([{ id: "extra" }]);
        const saved = await session.project.save({ format: 2 });

        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(saved.text, { rerun: false });
        assert.notInclude(codes(report.problems), "W_REFERENCE_UNBOUND");
        assert.isDefined(reopened.data.nodes().find((node) => node.id === "account:acct-1002"));
        session.dispose();
        reopened.dispose();
    });
});

/** The file a referenced source is read from, and the project file beside it. */
const FRIENDS = "https://example.test/p/friends.csv";
const PROJECT_AT = "https://example.test/p/x.graphty.json";
const FRIENDS_CSV = "source,target,w\nAva,Ben,1\nBen,Cara,2\n";

/**
 * Each node and edge as a reader sees it: its own columns, without graphty-element's provenance.
 * @param session - The session.
 * @returns The nodes and the edges, ids included.
 */
function rowsOf(session: GraphSession): unknown {
    const own = (record: Record<string, unknown>): Record<string, unknown> =>
        Object.fromEntries(Object.entries(record).filter(([name]) => !name.startsWith("_source.")));
    return { nodes: session.data.nodes().map(own), edges: session.data.edges().map(own) };
}

/**
 * A session that loaded friends.csv from its URL, and the file saved with it referenced by its
 * load key.
 * @param choices - The load's choices.
 * @returns The session and the saved text.
 */
async function savedByReference(
    choices: Parameters<GraphSession["data"]["import"]>[1] = {},
): Promise<{ session: GraphSession; text: string; problems: readonly DocumentProblem[] }> {
    const session = createGraphSession(ON);
    await session.data.import({ type: "csv", config: { url: FRIENDS } }, choices);
    const [{ key }] = session.data.sources();
    const saved = await session.project.save({ format: 2, embed: { [key]: "referenced" } });
    return { session, text: saved.text, problems: saved.report.leftOut as readonly DocumentProblem[] };
}

/**
 * The saved data section's one url, file or sample source.
 * @param text - The saved text.
 * @returns The record.
 */
function loadedRecord(text: string): JsonObject {
    const { sources } = (JSON.parse(text) as { sections: { data: { sources: JsonObject[] } } }).sections.data;
    return sources.find((each) => each.kind !== "reader") as JsonObject;
}

describe("a source saved by reference", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("is written without its rows and read again from its URL, the rows and edge ids unchanged", async () => {
        const fetched = vi.fn((url: string) => Promise.resolve(new Response(url === FRIENDS ? FRIENDS_CSV : "")));
        vi.stubGlobal("fetch", fetched);
        const { session, text, problems } = await savedByReference();
        assert.deepEqual(problems, []);
        const record = (
            JSON.parse(text) as { sections: { data: { sources: JsonObject[] } } }
        ).sections.data.sources.find((each) => each.kind === "url") as JsonObject;
        assert.notProperty(record, "copy");
        assert.property(record, "columns", "the columns an open checks the rows against");

        fetched.mockClear();
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, { fetchSources: true, location: PROJECT_AT });
        // The recipe that loaded the URL is kept, never applied: the data section rebuilt it.
        assert.deepEqual(codes(report.problems), ["W_RECIPE_NOT_APPLIED"]);
        assert.deepEqual(
            fetched.mock.calls.map(([url]) => url),
            [FRIENDS],
        );
        assert.deepEqual(rowsOf(reopened), rowsOf(session));

        // Saved again with no choice, it stays a reference.
        const again = JSON.parse((await reopened.project.save({ format: 2 })).text) as {
            sections: { data: { sources: JsonObject[] } };
        };
        assert.deepEqual(
            again.sections.data.sources.find((each) => each.kind === "url"),
            record,
        );
        session.dispose();
        reopened.dispose();
    });

    it("rejects an open aborted while it fetches, and changes nothing", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        let asked!: () => void;
        const fetching = new Promise<void>((resolve) => {
            asked = resolve;
        });
        vi.stubGlobal(
            "fetch",
            (_url: string, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => {
                        reject(init.signal?.reason as Error);
                    });
                    asked();
                }),
        );
        const target = await ownProject();
        const before = { rows: rowsOf(target), dirty: target.project.dirty };
        const controller = new AbortController();
        const opening = target.project.open(text, {
            fetchSources: true,
            location: PROJECT_AT,
            signal: controller.signal,
            discard: true,
        });
        await fetching;
        controller.abort(new Error("stop"));
        const error = await opening.then(
            () => undefined,
            (reason: unknown) => reason,
        );
        assert.strictEqual((error as Error | undefined)?.message, "stop");
        assert.deepEqual({ rows: rowsOf(target), dirty: target.project.dirty }, before);
        session.dispose();
        target.dispose();
    });
});

describe("a source saved by reference, checked", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reads a CSV again by the header columns its ends were found in", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response("from,to,w\nAva,Ben,1\nBen,Cara,2\n")));
        const { session, text, problems } = await savedByReference();
        assert.deepEqual(problems, []);
        assert.deepInclude(loadedRecord(text).mapping as JsonObject, {
            edges: {
                ...((loadedRecord(text).mapping as JsonObject).edges as JsonObject),
                source: "from",
                target: "to",
            },
        });
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, { fetchSources: true, location: PROJECT_AT });
        assert.deepEqual(codes(report.problems), ["W_RECIPE_NOT_APPLIED"]);
        assert.deepEqual(rowsOf(reopened), rowsOf(session));
        session.dispose();
        reopened.dispose();
    });

    it("embeds a sample asked to be referenced, which no open reads again, and says why", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text, problems } = await savedByReference({ origin: "sample" });
        const record = loadedRecord(text);
        assert.strictEqual(record.kind, "sample");
        assert.property(record, "copy");
        assert.deepEqual(problems, [
            { code: "W_SOURCE_EMBEDDED", params: { source: String(record.id), reason: "kind" } },
        ]);
        session.dispose();
    });

    it("refuses an embed or paths key that names no source", async () => {
        const session = await ownProject();
        for (const options of [{ embed: { nope: "referenced" as const } }, { paths: { nope: "own.csv" } }]) {
            const error = await refusal(session.project.save({ format: 2, ...options }));
            assert.strictEqual(error.code, "E_OPTION_RANGE");
            assert.deepEqual(error.details, { option: Object.keys(options)[0], value: "nope" });
        }

        session.dispose();
    });

    it("references a file source at the path the saver gives, refusing one above the folder", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        const above = await refusal(
            session.project.save({ format: 2, embed: { [key]: "referenced" }, paths: { [key]: "../friends.csv" } }),
        );
        assert.strictEqual(above.code, "E_OPTION_RANGE");
        const saved = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            paths: { [key]: "data/friends.csv" },
        });
        assert.deepEqual(saved.report.leftOut, []);
        const record = loadedRecord(saved.text);
        assert.notProperty(record, "copy");
        assert.strictEqual((record.origin as JsonObject).path, "data/friends.csv");

        const fetched = vi.fn((_url: string) => Promise.resolve(new Response(FRIENDS_CSV)));
        vi.stubGlobal("fetch", fetched);
        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text, { fetchSources: true, location: PROJECT_AT });
        assert.deepEqual(
            fetched.mock.calls.map(([url]) => url),
            ["https://example.test/p/data/friends.csv"],
        );
        assert.deepEqual(rowsOf(reopened), rowsOf(session));
        session.dispose();
        reopened.dispose();
    });

    it("fetches nothing a file names unless the caller lets it, nor for a data section it will not build", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        const fetched = vi.fn((_url: string) => Promise.resolve(new Response(FRIENDS_CSV)));
        vi.stubGlobal("fetch", fetched);
        const id = String(loadedRecord(text).id);
        const unasked = createGraphSession(ON);
        const report = await unasked.project.open(text, { location: PROJECT_AT });
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "needs-permission" },
        });

        const broken = JSON.parse(text) as { sections: { data: JsonObject } };
        broken.sections.data.build = 42;
        const refused = createGraphSession(ON);
        const kept = await refused.project.open(JSON.stringify(broken), { fetchSources: true, location: PROJECT_AT });
        assert.include(codes(kept.problems), "W_SECTION_KEPT");
        assert.strictEqual(fetched.mock.calls.length, 0);
        session.dispose();
        unasked.dispose();
        refused.dispose();
    });

    it("reads a referenced source no further than the open's size limit", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        // The file grew past the limit since the save; the project file is within it.
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV + "Dan,Eve,3\n".repeat(text.length))));
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, {
            fetchSources: true,
            location: PROJECT_AT,
            limits: { fileBytes: text.length + 8 },
        });
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: String(loadedRecord(text).id), reason: "too-large" },
        });
        assert.strictEqual(reopened.data.nodes().length, 0);
        session.dispose();
        reopened.dispose();
    });

    it("holds a changed file, and builds no rows on a refresh whose new bytes lack its roles", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        const id = String(loadedRecord(text).id);
        vi.stubGlobal("fetch", () => Promise.resolve(new Response("id\nAva\n")));
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, { fetchSources: true, location: PROJECT_AT });
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "copy-changed", size: 7 },
        });
        assert.notInclude(codes(report.problems), "W_MEMBER_LEFT_OUT");
        assert.strictEqual(reopened.data.nodes().length, 0);

        const refreshed = await reopened.data.refresh(id);
        assert.deepEqual(refreshed.added, { nodes: 0, edges: 0 });
        assert.strictEqual(reopened.data.nodes().length, 0);
        session.dispose();
        reopened.dispose();
    });

    it("keeps the reader's edit on a held source's row with its was, and applies it on refresh", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        const id = String(loadedRecord(text).id);
        const file = JSON.parse(text) as { sections: { data: { sources: JsonObject[] } } };
        const record = loadedRecord(text);
        const named = ((record.mapping as JsonObject).edges as JsonObject).sourceSpace;
        const space = typeof named === "string" ? named : `source:${id}`;
        const edit = { op: "edit", node: { space, key: "Ava" }, column: "note", value: "met", was: "stranger" };
        file.sections.data.sources.unshift({
            id: "reader",
            kind: "reader",
            origin: { copy: "01M7S78V5HDT471C8D95R002FN" },
            copy: { operations: [edit] },
        });
        const edited = JSON.stringify(file);
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(`${FRIENDS_CSV}Cara,Dan,3\n`)));
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(edited, { fetchSources: true, location: PROJECT_AT });
        assert.notInclude(codes(report.problems), "W_REFERENCE_UNBOUND");
        const saved = (JSON.parse((await reopened.project.save({ format: 2 })).text) as typeof file).sections.data;
        const reader = saved.sources.find((each) => each.kind === "reader") as JsonObject;
        assert.deepEqual((reader.copy as JsonObject).operations, [edit], "kept as read, its was included");

        await reopened.data.refresh(id);
        const ava = reopened.data.nodes().find((node) => node.id === "Ava");
        assert.strictEqual(ava?.note, "met");
        assert.isDefined(reopened.data.nodes().find((node) => node.id === "Dan"));
        session.dispose();
        reopened.dispose();
    });

    it("leaves a run on the old data stale after a refresh, so its save binds another build", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.import({ type: "csv", config: { url: FRIENDS } });
        await session.data.addNodes([{ id: "Zed" }]);
        const [{ key }] = session.data.sources();
        await session.runs.start("bfs", { source: "Zed" });
        const { text } = await session.project.save({ format: 2, results: true, embed: { [key]: "referenced" } });
        const id = String(loadedRecord(text).id);
        const reopened = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await reopened.project.open(text, { rerun: false, location: PROJECT_AT });
        await reopened.data.refresh(id);
        const again = await reopened.project.save({ format: 2, results: true });
        const { data, results } = sectionsOf(again.text);
        const [run] = Object.values(results.runs as Record<string, JsonObject>);
        assert.notStrictEqual((run.bindsTo as JsonObject).build, data.build);
        const third = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        const report = await third.project.open(again.text, { rerun: false, fetchSources: true, location: PROJECT_AT });
        assert.include(codes(report.problems), "W_DATA_CHANGED");
        session.dispose();
        reopened.dispose();
        third.dispose();
    });

    it("keeps a source held when a refresh still cannot fetch it", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        const id = String(loadedRecord(text).id);
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(text, { fetchSources: true, location: PROJECT_AT });
        assert.deepInclude(report.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "not-found" },
        });
        const error = await refusal(reopened.data.refresh(id));
        assert.strictEqual(error.code, "E_FETCH_FAILED");
        assert.deepEqual(error.details, { source: id, reason: "not-found" });
        assert.deepEqual(loadedRecord((await reopened.project.save({ format: 2 })).text), loadedRecord(text));

        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        await reopened.data.refresh(id);
        assert.deepEqual(rowsOf(reopened), rowsOf(session));
        session.dispose();
        reopened.dispose();
    });

    it("builds a source held for permission on refresh, the call being the permission", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const { session, text } = await savedByReference();
        const id = String(loadedRecord(text).id);
        const reopened = createGraphSession(ON);
        await reopened.project.open(text, { location: PROJECT_AT });
        assert.strictEqual(reopened.data.nodes().length, 0);
        const before = reopened.history.steps.length;
        await reopened.data.refresh(id);
        assert.deepEqual(rowsOf(reopened), rowsOf(session));
        assert.strictEqual(reopened.history.steps.length, before + 1, "one undoable step");
        session.dispose();
        reopened.dispose();
    });
});

describe("saving", () => {
    it("moves the save point only for a full file of every default section", async () => {
        const session = await ownProject();
        await session.project.save();
        await session.data.addNodes([{ id: "R" }]);
        assert.isTrue(session.project.dirty);

        await session.project.save({ format: 2, sections: ["style"], form: "section" });
        await session.project.save({ format: 2, sections: ["notes", "view"] });
        assert.isTrue(session.project.dirty, "a copy leaves the project dirty");

        await session.project.save({ format: 2 });
        assert.isFalse(session.project.dirty);
        session.dispose();
    });

    it("refuses a file with a duplicate member name, which is not I-JSON, and changes nothing", async () => {
        const session = await ownProject();
        const text = readText("examples/card-fraud.graphty.json");
        const duplicated = text.replace(
            '"kind": "graphty-document"',
            '"kind": "graphty-document", "kind": "graphty-document"',
        );
        assert.notStrictEqual(duplicated, text);
        const error = await refusal(session.project.open(duplicated));
        assert.strictEqual(error.code, "E_BAD_DOCUMENT");
        assert.deepEqual(error.details, { duplicate: "kind" });
        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            ["P", "Q"],
            "the open changed nothing",
        );
        session.dispose();
    });

    it("refuses a version 2 option without format 2", async () => {
        const session = createGraphSession(ON);
        for (const options of [{ sections: ["style" as const] }, { form: "section" as const }, { results: true }]) {
            assert.strictEqual((await refusal(session.project.save(options))).code, "E_BAD_COMMAND");
        }

        session.dispose();
    });

    it("reports what version 1 keeps that version 2 does not write yet", async () => {
        const session = await ownProject();
        await session.data.renameColumn({ kind: "edge", name: "w" }, "weight");
        const saved = await session.project.save({ format: 2 });
        assert.deepInclude(saved.report.leftOut, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-session", field: "columns" },
        });

        session.dispose();
    });

    it("holds the graph sections of a file whose graphs member it cannot read, and writes them back", async () => {
        const file = readJson("examples/card-fraud.graphty.json");
        file.graphs = [{ id: "second" }];
        const sections = file.sections as JsonObject;
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: false });
        const kept = report.problems
            .filter((problem) => problem.code === "W_SECTION_KEPT" && problem.params?.reason === "graphs")
            .map((problem) => problem.params?.section);
        assert.sameMembers(kept as string[], ["data", "results", "notes", "view"]);
        assert.strictEqual(session.data.nodes().length, 0, "the held data is not loaded");

        const saved = JSON.parse((await session.project.save({ format: 2, markSaved: false })).text) as JsonObject;
        assert.deepStrictEqual(saved.graphs, file.graphs, "the member is written back");
        for (const name of ["data", "results", "notes", "view"]) {
            assert.deepStrictEqual((saved.sections as JsonObject)[name], sections[name], `${name} is written back`);
        }
        session.dispose();
    });

    it("reports no column settings or issues left out when the file holds them", async () => {
        const session = createGraphSession(ON);
        await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        const saved = await session.project.save({ format: 2, markSaved: false });
        const fields = saved.report.leftOut
            .filter((problem) => problem.code === "W_MEMBER_LEFT_OUT")
            .map((problem) => problem.params?.field);
        assert.notInclude(fields, "columns");
        assert.notInclude(fields, "issues");
        session.dispose();
    });
});

describe("the sections a reader changed from the session", () => {
    it("restores the saved positions with rerun off, after the recipe sets the layout, and finds the data unchanged", async () => {
        const { session, problems } = await (async () => {
            const each = createGraphSession(ON);
            const report = await each.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
            return { session: each, problems: report.problems };
        })();
        // Results written on exactly the data the file holds match it.
        assert.notInclude(codes(problems), "W_DATA_CHANGED");
        const { order, xyz } = session.positions.snapshot();
        const at = order.indexOf("account:acct-1002");
        assert.deepEqual(
            [xyz[at * 3], xyz[at * 3 + 1], xyz[at * 3 + 2]].map((v) => Math.round(v * 10) / 10),
            [2, 2.4, -0.7],
        );
        session.dispose();
    });

    it("writes a view run's style the same in a section file as in a full file", async () => {
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.addEdges([{ source: "P", target: "Q" }]);
        await session.runs.start("bfs", { source: "P" });
        assert.isNotEmpty(session.runs.bindings(session.runs.list()[0].id), "the run's suggested layer reads it");
        const full = sectionsOf((await session.project.save({ format: 2, markSaved: false })).text).view;
        const alone = JSON.parse(
            (await session.project.save({ format: 2, sections: ["view"], form: "section" })).text,
        ) as JsonObject;
        const styles = (view: JsonObject): unknown[] =>
            Object.values((view.runs ?? {}) as Record<string, JsonObject>).map((run) => run.style);
        assert.isNotEmpty(styles(full));
        assert.deepEqual(styles(alone), styles(full));
        session.dispose();
    });

    it("binds a saved run to the data's build, so reopening it is a match", async () => {
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.addEdges([{ source: "P", target: "Q" }]);
        await session.runs.start("bfs", { source: "P" });
        const { text } = await session.project.save({ format: 2, results: true, markSaved: false });
        const { data, results } = sectionsOf(text);
        const [run] = Object.values(results.runs as Record<string, JsonObject>);
        assert.strictEqual((run.bindsTo as JsonObject).build, data.build);
        const opened = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        const report = await opened.project.open(text, { rerun: false });
        assert.notInclude(codes(report.problems), "W_DATA_CHANGED");
        session.dispose();
        opened.dispose();
    });
});

describe("a data section too costly to build", () => {
    const section = (body: JsonObject): Parameters<NonNullable<typeof dataCodec.holds>>[0] => ({
        header: { kind: "graphty-data", version: 2 },
        body,
        pointer: "",
    });

    it("holds a graph copy wider than the column cap, and an unset row outside its column", () => {
        const holds = (body: JsonObject): boolean => dataCodec.holds?.(section(body), [] as DocumentProblem[]) ?? false;
        const wide = {
            sources: [{ id: "s", kind: "file", copy: "graph" }],
            types: [],
            joins: [{ op: "join.add", source: "s" }],
            graph: {
                nodes: Array.from({ length: 5000 }, (_, at) => ({ id: at, "graphty.key": String(at), [`c${at}`]: 1 })),
                links: [],
            },
        };
        assert.isTrue(holds(wide));

        const outside = {
            sources: [
                {
                    id: "s",
                    kind: "file",
                    copy: { nodes: { id: ["a"], x: [{ y: 1 }] } },
                    columns: { nodes: { x: { name: "x", dtype: "json", unset: [7] } } },
                },
            ],
            types: [],
            joins: [{ op: "join.add", source: "s" }],
        };
        assert.isTrue(holds(outside));
    });
});

describe("the worked example, edited and reopened", () => {
    it("keeps an edited type layer's id and type selector, and its new color", async () => {
        const session = createGraphSession(ON);
        await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        const merchants = session.styles.list().find((layer) => layer.name === "Merchants");
        assert.isDefined(merchants);
        await session.styles.update(merchants.id, { set: { "node.color": "#123456" } });
        const saved = (await session.project.save({ format: 2, markSaved: false })).text;
        const written = (sectionsOf(saved).style.layers as JsonObject[]).find((layer) => layer.id === "merchants");
        assert.deepEqual(written?.selector, { match: "type", types: ["merchant"] });
        assert.strictEqual((written?.set as JsonObject)["node.color"], "#123456");
        assert.isFalse(
            ((sectionsOf(saved).view.layers ?? []) as JsonObject[]).some((layer) => layer.name === "Merchants"),
        );

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved, { rerun: false });
        const again = (await reopened.project.save({ format: 2, markSaved: false })).text;
        const kept = (sectionsOf(again).style.layers as JsonObject[]).find((layer) => layer.id === "merchants");
        assert.deepEqual(kept?.selector, { match: "type", types: ["merchant"] });
        assert.strictEqual((kept?.set as JsonObject)["node.color"], "#123456");
    });

    it("opens, saves and reopens with no error and no refused set", async () => {
        const features = { features: ["save-files-v2", "timeline"] };
        const session = createGraphSession(features);
        const opened = await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        assert.deepEqual(
            codes(opened.problems).filter((code) => code.startsWith("E_")),
            [],
        );
        assert.strictEqual(session.sets.list().length, 2);
        const saved = (await session.project.save({ format: 2, markSaved: false })).text;
        const reopened = createGraphSession(features);
        const again = await reopened.project.open(saved, { rerun: false });
        assert.deepEqual(codes(again.problems), codes(opened.problems));
    });
});

/** A browser file handle over one file's text, counting the permission calls. */
function fakeHandle(file: File, permission: "granted" | "prompt" = "granted"): ProjectFileHandle & { asked: number } {
    let state: "granted" | "prompt" | "denied" = permission;
    return {
        name: file.name,
        asked: 0,
        getFile: () => Promise.resolve(file),
        queryPermission: () => Promise.resolve(state),
        requestPermission() {
            this.asked++;
            state = "granted";
            return Promise.resolve(state);
        },
    };
}

describe("copy or reference, by path or by browser file handle", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("references a file by its handle with no path, reads it back, and asks for permission only on refresh", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        const handle = fakeHandle(new File([FRIENDS_CSV], "friends.csv"));
        const facts = await session.project.describe({ handles: { [key]: handle } });
        assert.isTrue(facts.sources.find((source) => source.key === key)?.referable);
        const saved = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            handles: { [key]: handle },
        });
        assert.deepEqual(saved.report.leftOut, []);
        const record = loadedRecord(saved.text);
        assert.notProperty(record, "copy");
        assert.notProperty(record.origin as JsonObject, "path");

        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(saved.text, { location: PROJECT_AT });
        assert.notInclude(codes(report.problems), "W_SOURCE_UNAVAILABLE");
        assert.deepEqual(rowsOf(reopened), rowsOf(session));
        // Saved again with no choice, it stays a reference by the same handle.
        assert.deepEqual(loadedRecord((await reopened.project.save({ format: 2 })).text), record);

        // A handle whose permission lapsed holds the source until a refresh asks.
        const lapsed = fakeHandle(new File([FRIENDS_CSV], "friends.csv"), "prompt");
        const again = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            handles: { [key]: lapsed },
        });
        const held = createGraphSession(ON);
        const heldReport = await held.project.open(again.text, { fetchSources: true });
        const id = String(loadedRecord(again.text).id);
        assert.deepInclude(heldReport.problems, {
            code: "W_SOURCE_UNAVAILABLE",
            params: { source: id, reason: "needs-permission" },
        });
        assert.strictEqual(lapsed.asked, 0, "an open never prompts");
        await held.data.refresh(id);
        assert.strictEqual(lapsed.asked, 1);
        assert.deepEqual(rowsOf(held), rowsOf(session));
        for (const each of [session, reopened, held]) {
            each.dispose();
        }
    });

    it("keeps a copy of a file with neither path nor handle, W_SOURCE_NO_PATH", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        const saved = await session.project.save({ format: 2, embed: { [key]: "referenced" } });
        const record = loadedRecord(saved.text);
        assert.property(record, "copy");
        assert.deepEqual(saved.report.leftOut, [
            { code: "W_SOURCE_NO_PATH", params: { source: String(record.id), reason: "file" } },
        ]);
        session.dispose();
    });

    it("rebases every path read to the file being saved, and drops one outside its folder", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        const first = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            paths: { [key]: "data/friends.csv" },
        });
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const reopened = createGraphSession(ON);
        await reopened.project.open(first.text, { fetchSources: true, location: PROJECT_AT });

        const up = await reopened.project.save({ format: 2, location: "https://example.test/x.graphty.json" });
        assert.strictEqual((loadedRecord(up.text).origin as JsonObject).path, "p/data/friends.csv");
        const away = await reopened.project.save({ format: 2, location: "https://example.test/q/x.graphty.json" });
        const embedded = loadedRecord(away.text);
        assert.property(embedded, "copy");
        assert.notProperty(embedded.origin as JsonObject, "path");
        assert.deepInclude(away.report.leftOut, {
            code: "W_SOURCE_NO_PATH",
            params: { source: String(embedded.id), reason: "file" },
        });

        // A held source is written back as read, its path rebased.
        const held = createGraphSession(ON);
        await held.project.open(first.text, { location: PROJECT_AT });
        const heldUp = await held.project.save({ format: 2, location: "https://example.test/x.graphty.json" });
        const heldRecord = loadedRecord(heldUp.text);
        assert.notProperty(heldRecord, "copy");
        assert.strictEqual((heldRecord.origin as JsonObject).path, "p/data/friends.csv");
        for (const each of [session, reopened, held]) {
            each.dispose();
        }
    });

    it("keeps a referenced file a copy with no path when the save gives no location, W_SOURCE_NO_PATH", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        const first = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            paths: { [key]: "data/friends.csv" },
        });
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        const reopened = createGraphSession(ON);
        await reopened.project.open(first.text, { fetchSources: true, location: PROJECT_AT });
        const nowhere = await reopened.project.save({ format: 2 });
        const embedded = loadedRecord(nowhere.text);
        assert.property(embedded, "copy");
        assert.notProperty(embedded.origin as JsonObject, "path");
        assert.deepInclude(nowhere.report.leftOut, {
            code: "W_SOURCE_NO_PATH",
            params: { source: String(embedded.id), reason: "file" },
        });

        // A held source, which has no rows, is written with no path, so reopening asks for the file.
        const held = createGraphSession(ON);
        await held.project.open(first.text, { location: PROJECT_AT });
        const heldNowhere = await held.project.save({ format: 2 });
        const heldRecord = loadedRecord(heldNowhere.text);
        assert.notProperty(heldRecord.origin as JsonObject, "path");
        assert.deepInclude(heldNowhere.report.leftOut, {
            code: "W_SOURCE_NO_PATH",
            params: { source: String(heldRecord.id), reason: "file" },
        });
        for (const each of [session, reopened, held]) {
            each.dispose();
        }
    });
});

describe("a file path is a POSIX path, not a URL", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("keeps '%', '#', '?' and backslash as part of the name when it rebases", () => {
        for (const name of ["100%.csv", "a#b.csv", "a?b.csv", "my%20file.csv", "a\\b.csv", "d/e f.csv"]) {
            assert.strictEqual(rebasedPath(name, PROJECT_AT, PROJECT_AT), name);
            assert.strictEqual(rebasedPath(name, PROJECT_AT, "https://example.test/x.graphty.json"), `p/${name}`);
        }

        assert.strictEqual(rebasedPath("../100%.csv", PROJECT_AT, "https://example.test/q/x.graphty.json"), undefined);
    });

    it("saves, opens and saves again a source whose path holds '%' or '#'", async () => {
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const [{ key }] = session.data.sources();
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(FRIENDS_CSV)));
        for (const path of ["100%.csv", "q#1.csv"]) {
            const first = await session.project.save({
                format: 2,
                embed: { [key]: "referenced" },
                paths: { [key]: path },
            });
            const reopened = createGraphSession(ON);
            await reopened.project.open(first.text, { location: PROJECT_AT });
            const again = await reopened.project.save({ format: 2, location: PROJECT_AT });
            assert.strictEqual((loadedRecord(again.text).origin as JsonObject).path, path);
            reopened.dispose();
        }

        session.dispose();
    });
});

describe("a file holding several graphs", () => {
    const TWO = readText("examples/minimal/minimal-graphs.graphty.json");
    const SECOND = "graph_01JCC0000000000000000000G2";

    it("opens the first graph from the top level and writes the later ones back as read", async () => {
        const session = createGraphSession(ON);
        const report = await session.project.open(TWO, { rerun: false, location: PROJECT_AT });
        const kept = report.problems.filter((problem) => problem.code === "W_SECTION_KEPT");
        assert.deepEqual(
            kept.map((problem) => problem.params),
            [
                { section: "data", version: 2, reason: "graphs", graph: SECOND },
                { section: "view", version: 1, reason: "graphs", graph: SECOND },
            ],
        );
        await session.data.addNodes([{ id: "extra" }]);
        const saved = JSON.parse((await session.project.save({ format: 2, location: PROJECT_AT })).text) as JsonObject;
        const read = JSON.parse(TWO) as JsonObject;
        assert.deepEqual(saved.graphs, read.graphs);
        assert.isDefined(session.data.nodes().find((node) => node.id === "extra"));
        session.dispose();
    });

    it("rebases a later graph's file paths, and holds every graph section when graphs is unreadable", async () => {
        const session = createGraphSession(ON);
        await session.project.open(TWO, { rerun: false, location: PROJECT_AT });
        const saved = JSON.parse(
            (await session.project.save({ format: 2, location: "https://example.test/x.graphty.json" })).text,
        ) as { graphs: { sections?: { data: { sources: JsonObject[] } } }[] };
        const [source] = saved.graphs[1].sections?.data.sources ?? [];
        assert.strictEqual((source.origin as JsonObject).path, "p/data/friends.csv");

        const broken = JSON.parse(TWO) as JsonObject;
        broken.graphs = [(broken.graphs as JsonObject[])[0]];
        const held = createGraphSession(ON);
        const report = await held.project.open(JSON.stringify(broken), { rerun: false });
        assert.deepInclude(report.problems, {
            code: "W_SECTION_KEPT",
            params: { section: "data", version: 2, reason: "graphs" },
        });
        session.dispose();
        held.dispose();
    });

    it("keeps a graph entry's unknown member and a later graph's unknown section key, and writes both back", async () => {
        const file = JSON.parse(TWO) as JsonObject;
        const graphs = file.graphs as JsonObject[];
        graphs[1] = { ...graphs[1], color: "teal" };
        const extra = { kind: "org.example.timeline", version: 1, ticks: [1, 2] };
        (graphs[1].sections as JsonObject)["org.example.timeline"] = extra;
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: false, location: PROJECT_AT });
        assert.notDeepInclude(report.problems, {
            code: "W_SECTION_KEPT",
            params: { section: "data", version: 2, reason: "graphs" },
        });
        assert.deepInclude(report.problems, {
            code: "W_UNKNOWN_KIND",
            params: { section: "org.example.timeline", graph: SECOND },
        });
        const saved = JSON.parse((await session.project.save({ format: 2, location: PROJECT_AT })).text) as JsonObject;
        assert.deepEqual(saved.graphs, file.graphs);
        session.dispose();
    });

    it("holds every graph section for a first entry with sections, or a repeated id", async () => {
        for (const change of [
            (graphs: JsonObject[]): void => {
                graphs[0] = { ...graphs[0], sections: {} };
            },
            (graphs: JsonObject[]): void => {
                graphs[1] = { ...graphs[1], id: graphs[0].id };
            },
        ]) {
            const file = JSON.parse(TWO) as JsonObject;
            change(file.graphs as JsonObject[]);
            const session = createGraphSession(ON);
            const report = await session.project.open(JSON.stringify(file), { rerun: false });
            assert.deepInclude(report.problems, {
                code: "W_SECTION_KEPT",
                params: { section: "data", version: 2, reason: "graphs" },
            });
            session.dispose();
        }
    });
});

describe("a later graph's file the save cannot name", () => {
    const TWO = readText("examples/minimal/minimal-graphs.graphty.json");

    it("stays a copy with no path, outside the saved file's folder or with no location, W_SOURCE_NO_PATH", async () => {
        const embedded = createGraphSession(ON);
        await embedded.data.import({ type: "csv", config: { file: new File([FRIENDS_CSV], "friends.csv") } });
        const { copy } = loadedRecord((await embedded.project.save({ format: 2 })).text);
        const file = JSON.parse(TWO) as { graphs: { sections?: { data: { sources: JsonObject[] } } }[] };
        const sources = file.graphs[1].sections?.data.sources ?? [];
        sources[0] = { ...sources[0], copy };
        const session = createGraphSession(ON);
        await session.project.open(JSON.stringify(file), { rerun: false, location: PROJECT_AT });
        for (const location of ["https://example.test/q/x.graphty.json", undefined]) {
            const saved = await session.project.save({ format: 2, ...(location === undefined ? {} : { location }) });
            const { graphs } = JSON.parse(saved.text) as typeof file;
            const [source] = graphs[1].sections?.data.sources ?? [];
            assert.deepEqual(source.copy, copy, `a copy, saved to ${String(location)}`);
            assert.notProperty(source.origin as JsonObject, "path");
            assert.deepInclude(saved.report.leftOut, {
                code: "W_SOURCE_NO_PATH",
                params: { source: String(source.id), reason: "file" },
            });
        }

        embedded.dispose();
        session.dispose();
    });
});

describe("a data section held whole", () => {
    it("is written back with its file paths rebased to the file being saved", async () => {
        const file = readJson("examples/minimal/minimal-graphs.graphty.json");
        const graphs = file.graphs as JsonObject[];
        const second = (graphs[1].sections as JsonObject).data as JsonObject;
        (file.sections as JsonObject).data = { ...second, id: "minimal-data" };
        // A first graph with sections makes graphs unreadable, so every section is held.
        graphs[0] = { ...graphs[0], sections: {} };
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: false, location: PROJECT_AT });
        assert.isTrue(
            report.problems.some((problem) => problem.code === "W_SECTION_KEPT" && problem.params.section === "data"),
        );
        const saved = await session.project.save({ format: 2, location: "https://example.test/x.graphty.json" });
        const [source] = (sectionsOf(saved.text).data.sources as JsonObject[]) ?? [];
        assert.strictEqual((source.origin as JsonObject).path, "p/data/friends.csv");
        const away = await session.project.save({ format: 2, location: "https://example.test/q/x.graphty.json" });
        const [lost] = sectionsOf(away.text).data.sources as JsonObject[];
        assert.notProperty(lost.origin as JsonObject, "path");
        assert.deepInclude(away.report.leftOut, {
            code: "W_SOURCE_NO_PATH",
            params: { source: String(lost.id), reason: "file" },
        });
        session.dispose();
    });
});

describe("readable paths in saved styles, filters and runs", () => {
    it("keeps a layer, a filter and a run reading a path this release does not compute, written back as read", async () => {
        const file = readJson("examples/card-fraud.graphty.json");
        const { style, view } = file.sections as Record<string, JsonObject>;
        const layer = (style.layers as JsonObject[]).find((each) => each.encode !== undefined) as JsonObject;
        layer.encode = {
            "node.color": { by: "graphty.type", scale: "passthrough", map: { account: "#0072b2" }, unmapped: "skip" },
        };
        const visibility = { filter: { on: "nodes", where: "graphty.space == 'account'" } };
        view.visibility = visibility;
        const run = (view.runs as JsonObject[])[0];
        run.scope = { where: "graphty.key == 'acct-7'" };
        delete run.replayable;
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: true });
        assert.deepInclude(report.problems, {
            code: "W_UNKNOWN_MEMBER",
            params: { section: "view", pointer: "/sections/view/visibility/filter", reason: "E_UNKNOWN_ATTRIBUTE" },
        });
        assert.isTrue(
            report.problems.some(
                (problem) =>
                    problem.code === "W_UNKNOWN_MEMBER" &&
                    problem.params.reason === "E_UNKNOWN_ATTRIBUTE" &&
                    problem.params.section === "style",
            ),
        );
        assert.deepInclude(report.problems, { code: "W_RUN_NOT_RUN", params: { run: String(run.id) } });
        assert.isNull(session.visibility.filter);
        const saved = sectionsOf((await session.project.save({ format: 2 })).text);
        assert.deepEqual(saved.view.visibility, visibility);
        assert.deepInclude(saved.style.layers as JsonObject[], layer);
        assert.deepInclude(saved.view.runs as JsonObject[], run);
        session.dispose();
    });

    it("keeps a view layer reading a readable path, and writes it back in its place", async () => {
        const file = readJson("examples/card-fraud.graphty.json");
        const { view } = file.sections as Record<string, JsonObject>;
        const layer = {
            id: "by-type",
            name: "By type",
            target: "node",
            selector: { match: "expression", where: "graphty.type == 'account'" },
            set: { "node.color": "#ff0000" },
        };
        const layers = view.layers as JsonObject[];
        layers.splice(1, 0, layer);
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: false });
        assert.deepInclude(report.problems, {
            code: "W_UNKNOWN_MEMBER",
            params: { section: "view", pointer: "/sections/view/layers/1", reason: "E_UNKNOWN_ATTRIBUTE" },
        });
        assert.isUndefined(session.styles.list().find((each) => each.name === "By type"));
        // Written back in its place even when the session's other view layers change.
        const suspects = session.styles.list().find((each) => each.name === "Suspects");
        assert.isDefined(suspects);
        await session.styles.update(suspects?.id, { name: "Suspects now" });
        const saved = sectionsOf((await session.project.save({ format: 2 })).text);
        const ids = (saved.view.layers as JsonObject[]).map((each) => each.id);
        assert.deepEqual(ids.slice(0, 2), ["suspects", "by-type"]);
        assert.deepInclude(saved.view.layers as JsonObject[], layer);
        session.dispose();
    });

    it("applies every visibility member but the one reading a readable path", async () => {
        const file = readJson("examples/card-fraud.graphty.json");
        const { view } = file.sections as Record<string, JsonObject>;
        const visibility = view.visibility as JsonObject;
        visibility.window = { ...(visibility.window as JsonObject), attribute: "graphty.time" };
        const session = createGraphSession(ON);
        const report = await session.project.open(JSON.stringify(file), { rerun: false });
        const unknown = report.problems.filter(
            (problem) => problem.code === "W_UNKNOWN_MEMBER" && problem.params.reason === "E_UNKNOWN_ATTRIBUTE",
        );
        assert.deepEqual(
            unknown.map((problem) => problem.params.pointer),
            ["/sections/view/visibility/window"],
        );
        assert.isNotNull(session.visibility.filter);
        assert.isNull(session.visibility.window);
        assert.isTrue(session.visibility.showContext);
        const saved = sectionsOf((await session.project.save({ format: 2 })).text);
        assert.deepEqual(saved.view.visibility, visibility);
        session.dispose();
    });
});

describe("what a project gets once, worked out on open", () => {
    /**
     * A version 2 project with the starting rows and a time field, so it has its Timeline Hidden row.
     * @returns The saved file's sections.
     */
    async function timedProject(): Promise<Record<string, JsonObject>> {
        const source = createGraphSession(ON);
        await source.config.set({ startingRows: true });
        const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}`, t: i }));
        await source.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        await source.time.setField({ nodes: { start: "t" } });
        const file = JSON.parse((await source.project.save({ format: 2 })).text) as JsonObject;
        source.dispose();
        return file.sections as Record<string, JsonObject>;
    }

    /**
     * Open a version 2 file of these sections in a session, the starting rows on unless asked off.
     * @param sections - The file's sections.
     * @param session - The session to open it in; a new one when absent.
     * @param startingRows - Whether the session draws the starting rows.
     * @returns The session.
     */
    async function openIn(
        sections: Record<string, JsonObject>,
        session?: GraphSession,
        startingRows = true,
    ): Promise<GraphSession> {
        const target = session ?? createGraphSession(ON);
        await target.config.set({ startingRows });
        const file = { kind: "graphty-document", version: 2, generator: { name: "test", version: "0" }, sections };
        await target.project.open(JSON.stringify(file), { discard: true, rerun: false });
        return target;
    }

    const outside = (session: GraphSession): { target: string }[] =>
        session.styles
            .list()
            .filter(
                (layer) =>
                    JSON.stringify(layer.selector) === JSON.stringify({ match: "state", state: "outsideWindow" }),
            );

    it("never saves the flags", async () => {
        const sections = await timedProject();
        assert.notProperty(sections.settings.settings as JsonObject, "timelineHiddenAdded");
        assert.notProperty(sections.settings.settings as JsonObject, "startingCamerasWritten");
    });

    it("counts the Timeline Hidden row as written when the file carries a style section", async () => {
        const sections = await timedProject();
        const session = await openIn(sections);
        // The row the style section holds, one layer per target, and no second copy.
        assert.sameMembers(
            outside(session).map((layer) => layer.target),
            ["node", "edge"],
        );
        assert.isTrue(session.config.timelineHiddenAdded);
        session.dispose();
    });

    it("writes the Timeline Hidden row once when the file carries no style section", async () => {
        const sections = await timedProject();
        Reflect.deleteProperty(sections, "style");
        const session = await openIn(sections);
        assert.sameMembers(
            outside(session).map((layer) => layer.target),
            ["node", "edge"],
        );
        assert.isTrue(session.config.timelineHiddenAdded);
        session.dispose();
    });

    it("counts the starting views as written only when the file carries a view section", async () => {
        const sections = await timedProject();
        const withView = await openIn(sections);
        assert.isTrue(withView.config.startingCamerasWritten);
        withView.dispose();

        Reflect.deleteProperty(sections, "view");
        const without = await openIn(sections);
        assert.isFalse(without.config.startingCamerasWritten);
        await without.views.setStartingCameras([{ name: "Top", follows: "topView", key: "1" }]);
        assert.include([...without.views.keys()], "Top");
        assert.isTrue(without.config.startingCamerasWritten);
        without.dispose();
    });

    it("resets the previous project's flags", async () => {
        const sections = await timedProject();
        const session = await openIn(sections);
        assert.isTrue(session.config.timelineHiddenAdded);
        assert.isTrue(session.config.startingCamerasWritten);
        const bare = { data: sections.data, settings: sections.settings };
        // No starting rows, so nothing writes the row: the flag is the open's own, not the last project's.
        await openIn(bare, session, false);
        assert.isFalse(session.config.timelineHiddenAdded);
        assert.isFalse(session.config.startingCamerasWritten);
        session.dispose();
    });
});
