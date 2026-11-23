/**
 * @file What a version 2 save keeps of the data around the rows, read through the public session
 * API: the repeated edges a reader kept and the issues ignored, the save choices of a referenced
 * source an open could not read, reader adds and edits, and element references a file spells wrong.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };
const FRIENDS = "https://example.test/p/friends.csv";
const FRIENDS_CSV = "source,target,w\nAva,Ben,1\nBen,Cara,2\n";

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
 * A version 2 save's sections.
 * @param session - The session.
 * @returns The sections, by name.
 */
async function sectionsOf(session: GraphSession): Promise<Record<string, JsonObject>> {
    const { text } = await session.project.save({ format: 2, markSaved: false });
    return (JSON.parse(text) as { sections: Record<string, JsonObject> }).sections;
}

/**
 * A session holding one CSV edge list.
 * @param csv - The rows.
 * @returns The session.
 */
async function loaded(csv: string): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.import({ type: "csv", config: { data: csv }, name: "edges.csv" });
    return session;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("the issues a version 2 save keeps", () => {
    const REPEATED = "source,target\nA,B\nA,B\nC,D\n";

    it("writes the pairs whose repeated edges were kept as node references, and a reopen keeps them kept", async () => {
        const session = await loaded(REPEATED);
        await session.data.fix("repeated-edge:edge", "keep");
        assert.notInclude(
            session.data.issues().map((each) => each.id),
            "repeated-edge:edge",
        );
        const { data } = await sectionsOf(session);
        const issues = data.issues as { kept: { from: JsonObject; to: JsonObject }[] };
        assert.lengthOf(issues.kept, 1);
        assert.deepEqual([issues.kept[0].from.key, issues.kept[0].to.key], ["A", "B"]);

        const { text } = await session.project.save({ format: 2 });
        const opened = createGraphSession(ON);
        await opened.project.open(text);
        assert.lengthOf(opened.data.edges(), 3, "both edges of the pair are there");
        assert.notInclude(
            opened.data.issues().map((each) => each.id),
            "repeated-edge:edge",
            "the pair stays kept",
        );
        session.dispose();
        opened.dispose();
    });

    it("writes no kept pair whose ends the reader removed since", async () => {
        const session = await loaded(REPEATED);
        await session.data.fix("repeated-edge:edge", "keep");
        await session.data.removeNodes(["A", "B"]);
        const { data } = await sectionsOf(session);
        assert.notProperty(data, "issues", "nothing ignored and no pair left to keep");
        session.dispose();
    });

    it("keeps an ignored issue of a column and leaves out one about refused rows, which a copy does not hold", async () => {
        const session = await loaded("source,target,note\nA,B, hi \nC,D,ok,extra\n");
        const ids = session.data.issues().map((each) => each.id);
        assert.include(ids, "refused-row");
        await session.data.ignoreIssues(session.data.issues());
        const { data } = await sectionsOf(session);
        const { ignored } = data.issues as { ignored: JsonObject[] };
        assert.notInclude(
            ignored.map((each) => each.code),
            "refused-row",
        );
        assert.lengthOf(ignored, ids.length - 1);
        session.dispose();
    });
});

describe("the save choices of a referenced source an open could not read", () => {
    it("lists it referenced and referable, with no rows, and refuses nothing", async () => {
        stubSite({ [FRIENDS]: FRIENDS_CSV });
        const session = createGraphSession(ON);
        await session.data.import({ type: "csv", config: { url: FRIENDS } });
        const [{ key }] = session.data.sources();
        const { text } = await session.project.save({ format: 2, embed: { [key]: "referenced" } });

        stubSite({});
        const opened = createGraphSession(ON);
        await opened.project.open(text, { fetchSources: true });
        const { sources } = await opened.project.describe();
        assert.lengthOf(sources, 1);
        assert.deepInclude(sources[0], { storage: "referenced", referable: true, nodes: 0, edges: 0 });
        assert.notProperty(sources[0], "refused");
        session.dispose();
        opened.dispose();
    });
});

describe("the reader's own rows in a version 2 save", () => {
    it("declares only the columns an added node holds a value in", async () => {
        const session = await loaded(FRIENDS_CSV);
        await session.data.addNodes([{ id: "Dan", score: 2, note: undefined }]);
        const { data } = await sectionsOf(session);
        const reader = (data.sources as JsonObject[]).find((each) => each.kind === "reader") as JsonObject;
        const add = ((reader.copy as JsonObject).operations as JsonObject[]).find((op) => op.op === "add");
        assert.isDefined(add);
        assert.deepEqual(Object.keys(add?.columns as JsonObject).sort(), ["id", "score"], "no note");
        session.dispose();
    });

    it("keeps a loaded node's value edited twice as the last edit, through a save and a reopen", async () => {
        const session = await loaded(FRIENDS_CSV);
        await session.data.updateNodes([{ id: "Ava", values: { mood: "calm" } }]);
        await session.data.updateNodes([{ id: "Ava", values: { mood: "bold" } }]);
        const { text } = await session.project.save({ format: 2 });
        const opened = createGraphSession(ON);
        await opened.project.open(text);
        assert.strictEqual(opened.data.node("Ava")?.mood, "bold");
        session.dispose();
        opened.dispose();
    });
});

describe("element references a version 2 file spells wrong", () => {
    it("binds no note target whose node space or edge load is empty, and reports each", async () => {
        const session = await loaded(FRIENDS_CSV);
        const { text } = await session.project.save({ format: 2 });
        const file = JSON.parse(text) as { sections: Record<string, JsonObject> };
        const [loadId] = (file.sections.data.sources as JsonObject[])
            .filter((each) => each.kind !== "reader")
            .map((each) => String(each.id));
        file.sections.notes = {
            ...file.sections.notes,
            notes: [
                {
                    id: "n1",
                    text: "two bad targets and a good one",
                    targets: [
                        { node: { space: "", key: "Ava" } },
                        { edge: { load: "", key: "Ava|Ben#0" } },
                        { node: { space: `source:${loadId}`, key: "Ava" } },
                    ],
                },
            ],
        };
        const opened = createGraphSession(ON);
        const report = await opened.project.open(JSON.stringify(file));
        const unbound = report.problems.filter((problem) => problem.code === "W_REFERENCE_UNBOUND");
        assert.deepEqual(
            unbound.map((problem) => problem.params.pointer),
            ["/sections/notes/notes/0/targets/0", "/sections/notes/notes/0/targets/1"],
        );
        session.dispose();
        opened.dispose();
    });
});
