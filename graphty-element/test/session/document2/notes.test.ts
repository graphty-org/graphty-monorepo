/**
 * @file The version 2 notes codec (spec 4.6), behind the `save-files-v2` experiment: targets as
 * element references, unbound references kept and written back, unknown target kinds kept, the
 * replace report, and both round trips. Element references come from a stand-in.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { notesCodec } from "../../../src/session/document2/codecs/notes";
import type {
    DocumentProblem,
    DocumentSection,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionHeader,
    WriteContext,
} from "../../../src/session/document2/types";
import { createGraphSession } from "../../../src/session/GraphSession";
import type { CannedOutcomes } from "../../../src/session/projectFile";
import type { GraphSession, ProjectSlice } from "../../../src/session/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-notes/v2.json"));

const SPACE = "source:s1";
const NOTE_A = "note_01JCBQ4Z8N5V2W7XKD3M9RTF6A";
const NOTE_B = "note_01JCBQ9H2C7YB4F0S6NWEX1KPD";

/**
 * Stand-in element references: a node is (source:s1, its id as text), an edge is keyed by its
 * session id. Ids in `gone` act as elements the graph no longer holds.
 * @param session - The session.
 * @param gone - Ids to treat as absent.
 * @returns The references.
 */
function standInRefs(session: GraphSession, gone: ReadonlySet<string> = new Set()): ElementRefs {
    const nodeOf = (key: string): NodeId | undefined =>
        gone.has(key) ? undefined : session.data.nodes().find((node) => String(node.id) === key)?.id;
    const nodeRef = (id: NodeId): { space: string; key: string } | undefined =>
        nodeOf(String(id)) === undefined ? undefined : { space: SPACE, key: String(id) };
    return {
        nodeRef,
        edgeRef(id: EdgeId) {
            const edge = gone.has(id) ? undefined : session.data.edge(id);
            const from = edge && nodeRef(edge.source);
            const to = edge && nodeRef(edge.target);
            return from === undefined || to === undefined ? undefined : { from, to, key: id };
        },
        node(ref: unknown) {
            const { space, key } = ref as { space?: unknown; key?: unknown };
            return space === SPACE && typeof key === "string" ? nodeOf(key) : undefined;
        },
        edge(ref: unknown) {
            const { key } = ref as { key?: unknown };
            return typeof key === "string" && !gone.has(key) && session.data.edge(key) !== undefined ? key : undefined;
        },
    };
}

/**
 * Write the session's notes section.
 * @param session - The session.
 * @param gone - Ids the stand-in treats as absent.
 * @returns The section as framing would assemble it, and the problems.
 */
async function save(
    session: GraphSession,
    gone?: ReadonlySet<string>,
): Promise<{ section: JsonObject; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [];
    const context: WriteContext = {
        session,
        problems,
        refs: () => standInRefs(session, gone),
        dataId: () => "data-1",
        sections: new Set<DocumentSection>(["notes"]),
        embed: {},
        isDerived: () => false,
        bindsTo: () => Promise.resolve({ data: "data-1" }),
    };
    const written = await notesCodec.write(context);
    const section = {
        kind: "graphty-notes",
        version: 2,
        generator: { name: "test", version: "0" },
        ...written.header,
        bindsTo: { data: "data-1" },
        ...written.body,
    };
    return { section, problems };
}

/**
 * Open a notes section into a session through one transaction.
 * @param session - The session.
 * @param section - The section, header and body together.
 * @param options - The stand-in's absent ids and the data section the open also loads.
 * @param options.gone - Ids the stand-in treats as absent.
 * @param options.data - The data section's body.
 * @returns The problems.
 */
async function open(
    session: GraphSession,
    section: JsonObject,
    options: { gone?: ReadonlySet<string>; data?: JsonObject } = {},
): Promise<DocumentProblem[]> {
    const problems: DocumentProblem[] = [];
    const { notes, ...header } = section;
    const read: ReadSection = { header: header as unknown as SectionHeader, body: { notes }, pointer: "" };
    await session.transaction("Open", async (tx) => {
        const context: ReadContext = {
            session,
            problems,
            refs: () => standInRefs(session, options.gone),
            dataId: () => "data-1",
            sections: new Set<DocumentSection>(["notes"]),
            tx,
            rerun: true,
            dataMode: "replace",
            restored: new Set<ProjectSlice>(),
            other: (name) =>
                name === "data" && options.data !== undefined
                    ? { header: { kind: "graphty-data", version: 2 }, body: options.data, pointer: "/sections/data" }
                    : undefined,
            canned: new Map() as CannedOutcomes,
            restoreDerived: () => undefined,
        };
        await notesCodec.read(read, context);
    });
    return problems;
}

/**
 * The schema's errors for a section, empty when it validates.
 * @param section - The section.
 * @returns The errors.
 */
function invalid(section: JsonObject): string[] {
    const validate = ajv.getSchema("https://graphty.app/schema/documents/graphty-notes/v2.json");
    assert.isDefined(validate);
    return validate(section) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${String(e.message)}`);
}

const ref = (key: string): JsonObject => ({ space: SPACE, key });

/** A section holding every target kind, an unbound reference, an unknown kind and an unknown field. */
function fileSection(edge: EdgeId): JsonObject {
    return {
        kind: "graphty-notes",
        version: 2,
        modified: "2026-11-14T17:59:10.000Z",
        generator: { name: "test", version: "0" },
        language: "en",
        bindsTo: { data: "data-1" },
        notes: [
            {
                id: NOTE_A,
                time: "2026-11-14T17:55:00.000Z",
                targets: [
                    { node: ref("a") },
                    { node: ref("11") },
                    { edge: { from: ref("a"), to: ref("b"), key: edge } },
                    { node: ref("nowhere") },
                ],
                text: "Both log in from **dev-9f3**.",
                mediaType: "text/markdown",
                author: "M. Okafor",
            },
            {
                id: NOTE_B,
                time: "2026-11-14T17:58:00.000Z",
                edited: "2026-11-14T17:59:10.000Z",
                targets: [
                    { graph: true },
                    { set: "set_suspects", name: "Suspects" },
                    { result: "fraud__rank" },
                    { item: { result: "fraud__rings", key: { field: "community", value: 3 } } },
                    { filterStep: "s1" },
                ],
                text: "Card testing.",
                done: "2026-11-14T17:59:10.000Z",
                cites: [{ result: "fraud__rank" }],
                extensions: { "com.example.app": { pinned: true } },
                reviewed: true,
            },
        ],
    };
}

/**
 * A session with nodes a, b, c and 11 and edges a -> b, b -> c and two c -> 11, loaded as a file
 * is, so its edges carry their load identity.
 * @returns The session.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    const data = JSON.stringify({
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: 11 }],
        edges: [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: 11 },
            { src: "c", dst: 11 },
        ],
    });
    await session.execute({ op: "data.import", source: { type: "json", config: { data } }, mode: "replace" });
    return session;
}

const firstEdge = (session: GraphSession): EdgeId => {
    const edge = session.data.edges().find((each) => each.source === "a" && each.target === "b");
    assert.isDefined(edge);
    return edge.id;
};

describe("the version 2 notes codec", () => {
    it("writes the session's notes as element references that validate", async () => {
        const session = await loaded();
        session.notes.add({ text: "the hub", targets: [{ node: "a" }, { node: 11 }] });
        session.notes.add({ text: "this edge", targets: [{ edge: firstEdge(session) }, { graph: true }] });

        const { section, problems } = await save(session);
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(problems, []);
        const notes = section.notes as JsonObject[];
        assert.deepEqual(
            notes.map((note) => note.targets),
            [
                [{ node: ref("a") }, { node: ref("11") }],
                [{ edge: { from: ref("a"), to: ref("b"), key: firstEdge(session) } }, { graph: true }],
            ],
        );
        for (const note of notes) {
            assert.strictEqual(note.time, new Date(String(note.time)).toISOString());
        }
    });

    it("round-trips state -> section -> state", async () => {
        const session = await loaded();
        session.notes.add({ text: "the hub", targets: [{ node: "a" }] });
        const second = session.notes.add({ text: "this edge", targets: [{ edge: firstEdge(session) }] });
        session.notes.update(second, { done: true });
        const { section } = await save(session);

        const other = await loaded();
        const problems = await open(other, section);
        assert.deepEqual(problems, []);
        const strip = (s: GraphSession): unknown =>
            s.notes.list().map(({ id, time, text, done }) => ({ id, time, text, done, status: s.notes.status(id) }));
        assert.deepEqual(strip(other), strip(session));
        // The targets name the same elements: the other session writes the same section.
        assert.deepEqual((await save(other)).section, section);
    });

    it("round-trips section -> state -> section byte for byte, keeping what it cannot bind", async () => {
        const session = await loaded();
        const file = fileSection(firstEdge(session));
        assert.deepEqual(invalid(file), []);

        const problems = await open(session, file);
        assert.deepEqual(problems, [
            {
                code: "W_REFERENCE_UNBOUND",
                params: {
                    section: "notes",
                    pointer: "/notes/0/targets/3",
                    ref: '{"key":"nowhere","space":"source:s1"}',
                },
            },
            { code: "W_UNKNOWN_MEMBER", params: { section: "notes", pointer: "/notes/1/reviewed" } },
        ]);
        assert.strictEqual(session.notes.list().length, 2);
        const status = session.notes.status(NOTE_A).targets.map((target) => target.state);
        assert.deepEqual(status, ["present", "present", "present", "unsupported"]);
        assert.strictEqual(session.notes.status(NOTE_B).targets[4].state, "unsupported");

        const { section } = await save(session);
        const { modified: _modified, ...expected } = file;
        assert.strictEqual(JSON.stringify(section), JSON.stringify(expected));
        assert.deepEqual(invalid(section), []);
    });

    it("writes a reference back as read when its element is gone at save", async () => {
        const session = await loaded();
        await open(session, fileSection(firstEdge(session)));
        const { section, problems } = await save(session, new Set(["a"]));
        const [note] = section.notes as JsonObject[];
        assert.deepEqual((note.targets as unknown[])[0], { node: ref("a") });
        assert.include(
            problems.map((problem) => problem.params.pointer),
            "/notes/0/targets/0",
        );
    });

    it("binds a kept reference once the data holds its element", async () => {
        const session = await loaded();
        await open(session, fileSection(firstEdge(session)), { gone: new Set(["a"]) });
        assert.strictEqual(session.notes.status(NOTE_A).targets[0].state, "unsupported");
        const { section, problems } = await save(session);
        const [note] = section.notes as JsonObject[];
        assert.deepEqual((note.targets as unknown[])[0], { node: ref("a") });
        assert.notInclude(
            problems.map((problem) => problem.params.pointer),
            "/notes/0/targets/0",
        );
    });

    it("reports W_REPLACED_SINCE for a source replaced after the section was written", async () => {
        const session = await loaded();
        const problems = await open(session, fileSection(firstEdge(session)), {
            data: {
                sources: [
                    { id: "src_old", replaced: "2026-11-01T00:00:00.000Z" },
                    { id: "src_new", replaced: "2026-11-15T00:00:00.000Z" },
                ],
            },
        });
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_REPLACED_SINCE"),
            [{ code: "W_REPLACED_SINCE", params: { section: "notes", source: "src_new" } }],
        );
    });

    it("skips a note the schema refuses and adds the rest", async () => {
        const session = await loaded();
        const file = fileSection(firstEdge(session));
        const notes = file.notes as JsonObject[];
        const problems = await open(session, { ...file, notes: [{ ...notes[0], author: "" }, notes[1]] });
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { section: "notes", pointer: "/notes/0" },
        });
        assert.deepEqual(
            session.notes.list().map((note) => note.id),
            [NOTE_B],
        );
    });

    it("opening the same section twice adds nothing the second time", async () => {
        const session = await loaded();
        const file = fileSection(firstEdge(session));
        await open(session, file);
        await open(session, file);
        assert.strictEqual(session.notes.list().length, 2);
    });
});
