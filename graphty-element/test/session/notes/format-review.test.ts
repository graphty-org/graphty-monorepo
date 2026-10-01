/**
 * @file Format review probes for the notes member (design/documents/notes.md): byte-stable round
 * trips of what a file holds, oldest-first order by instant, the reserved `graphty.` root for a
 * column of any name under it, and conformance note-16.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session/GraphSession";
import type { ElementSession } from "../../../src/session/types";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { notesHarness, refusalOf } from "./harness";

const schemaUrl = new URL("../../../../design/documents/notes.schema.json", import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaUrl, "utf8")) as object);

/**
 * What the schema says about a member.
 * @param member - The member.
 * @returns Its errors, or an empty list.
 */
function schemaErrors(member: unknown): string[] {
    return validate(member) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ""}`);
}

/**
 * One node's painted label.
 * @param h - The harness.
 * @param id - The node.
 * @returns The label, or undefined.
 */
function labelOf(h: Harness, id: string): unknown {
    const session = h.session as ElementSession;
    return session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.label"];
}

describe("format review: round trip", () => {
    it("writes a file back byte for byte: other time spellings, number ids, unknown fields and targets", () => {
        const text = JSON.stringify({
            kind: "graphty-notes",
            version: 1,
            notes: [
                {
                    id: "note_550e8400-e29b-41d4-a716-446655440000",
                    time: "2026-10-01T10:00:00+02:00",
                    targets: [
                        { node: 11 },
                        { edge: { source: "a", target: 11, id: 7 } },
                        { edge: { source: "c", target: 11, ordinal: 1, among: 2 } },
                        { set: "set_x" },
                        { item: { result: "r", run: "run1", key: { field: "f", value: true } } },
                        { future: { z: 1, a: 2 } },
                        { graph: true },
                    ],
                    text: "  spaced\r\n",
                    mediaType: "TEXT/Markdown; variant=GFM",
                    author: "Bob",
                    edited: "2026-10-01T08:30:00.5-00:00",
                    cites: [{ result: "r", run: "run1" }],
                    extensions: { "org.b": 1, "com.a": { z: [1, null, "x"], a: false } },
                    zeta: 1,
                    alpha: { b: 2, a: 1 },
                },
                {
                    id: "note_b",
                    time: "2026-10-01T09:00:00Z",
                    targets: [{ node: "11" }],
                    text: "later",
                },
            ],
        });
        assert.deepEqual(schemaErrors(JSON.parse(text)), []);
        const { session } = notesHarness();
        session.notes.mergeDocument(JSON.parse(text));
        const once = JSON.stringify(session.notes.toDocument());
        assert.strictEqual(once, text);

        const fresh = notesHarness().session;
        fresh.notes.mergeDocument(JSON.parse(once));
        assert.strictEqual(JSON.stringify(fresh.notes.toDocument()), text);
    });

    it("orders oldest first by instant, then by id, whatever order the file held", () => {
        const { session } = notesHarness();
        const note = (id: string, time: string): unknown => ({ id, time, targets: [{ graph: true }], text: id });
        session.notes.mergeDocument({
            kind: "graphty-notes",
            version: 1,
            notes: [
                note("note_c", "2026-10-01T09:00:00Z"),
                note("note_b", "2026-10-01T09:00:00.000Z"),
                note("note_a", "2026-10-01T10:00:00+02:00"),
            ],
        });
        assert.deepEqual(
            session.notes.toDocument().notes.map((n) => n.id),
            ["note_a", "note_b", "note_c"],
        );
    });

    it("validates every note the API can write, with every target kind", async () => {
        const h = notesHarness();
        const { session } = h;
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        session.notes.add({
            text: "all",
            targets: [
                { graph: true },
                { node: "a" },
                { node: 11 },
                { edge: edgeBetween(h, "a", "b") },
                { edge: edgeBetween(h, "c", 11) },
                { set },
                { result: "deg" },
                { item: { result: "deg", key: { field: "group", value: "x" } } },
            ],
            cites: [{ result: "deg" }],
        });
        const doc = session.notes.toDocument();
        assert.deepEqual(schemaErrors(doc), []);
        const written = doc.notes[0];
        assert.match(written.id, /^note_[0-9A-HJKMNP-TV-Z]{26}$/);
        assert.match(written.time, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    });
});

describe("format review: binding by identity only", () => {
    // notes.md "Binding" rule 2: an edge id graphty-element made up during a session means nothing
    // in another session, so such a target reads missing when it is opened.
    it("a file's edge target with a session-made id graphty:e<n> reads missing, and counts nowhere", () => {
        const h = notesHarness();
        const { session } = h;
        session.notes.mergeDocument({
            kind: "graphty-notes",
            version: 1,
            notes: [
                {
                    id: "note_m",
                    time: "2026-10-01T09:00:00Z",
                    targets: [{ edge: { source: "a", target: "b", id: "graphty:e0" } }],
                    text: "from another session",
                },
            ],
        });
        assert.strictEqual(session.notes.status("note_m").targets[0].state, "missing");
        assert.deepEqual(session.notes.counts(), { notes: 1, nodes: 0, edges: 0 });
    });

    // notes.md "Targets" rule 2: an edge the session added has no position, so its made-up id is
    // written; it binds in this session, and reads missing once opened from a file.
    it("saves a session edge by its made-up id, which binds here and not from a file", () => {
        const h = notesHarness();
        const id = h.session.notes.add({ text: "x", targets: [{ edge: edgeBetween(h, "a", "b") }] });
        assert.strictEqual(h.session.notes.status(id).targets[0].state, "present");
        const saved = JSON.parse(JSON.stringify(h.session.notes.toDocument())) as unknown;
        const other = notesHarness().session;
        other.notes.mergeDocument(saved);
        assert.strictEqual(other.notes.status(id).targets[0].state, "missing");
    });
});

describe("format review: reserved graphty. root", () => {
    it("a column named graphty.x: bare graphty.x reads nothing, data.graphty.x reads the column", async () => {
        const h = makeSession({ directed: true });
        h.add([{ id: "a", "graphty.x": "col" }, { id: "b" }]);
        const { session } = h;

        const bare = {
            name: "Bare",
            target: "node" as const,
            selector: { match: "everything" as const },
            encode: { "node.label": { by: "graphty.x" } },
        };
        const result = session.styles.validate(bare);
        assert.deepEqual(result.unresolvedPaths, ["graphty.x"]);
        assert.deepEqual(result.shadowedPaths, ["graphty.x"]);
        await session.styles.add(bare);
        await session.styles.settled();
        assert.isUndefined(labelOf(h, "a"), "never the column");

        await session.styles.add({
            name: "Column",
            target: "node",
            selector: { match: "has", path: "data.graphty.x" },
            encode: { "node.label": { by: "data.graphty.x" } },
        });
        await session.styles.settled();
        assert.strictEqual(String(labelOf(h, "a")), "col");
    });

    it("a where expression reads data.graphty.x as the column and graphty.x as nothing", async () => {
        const h = makeSession({ directed: true });
        h.add([{ id: "a", "graphty.x": 5 }, { id: "b" }]);
        const { session } = h;
        await session.selection.apply({ where: "data.graphty.x == `5`" });
        assert.deepEqual(session.selection.nodes, ["a"]);
        await session.selection.apply({ where: "graphty.x == `5`" });
        assert.deepEqual(session.selection.nodes, []);
    });

    it("the filter reads data.graphty.x and is not refused as a notes path", async () => {
        const h = makeSession({ directed: true });
        h.add([{ id: "a", "graphty.x": 5 }, { id: "b", "graphty.x": 1 }]);
        const { session } = h;
        assert.isNull(refusalOf(() => session.visibility.set({ kind: "expression", where: "data.graphty.x > `2`" })));
        await session.styles.settled();
        assert.isNotNull(session.visibility.filter);
    });
});

describe("format review: the reader agrees with the schema", () => {
    // notes.md "Opening" rule 5: a note the schema refuses is skipped; one it accepts is added,
    // unless a limit the schema cannot express (bytes, depth) refuses it.
    it("a leap second, which JavaScript dates cannot hold, is refused by the schema and skipped", () => {
        const note = { id: "note_l", time: "2026-12-31T23:59:60Z", targets: [{ node: "a" }], text: "x" };
        const doc = { kind: "graphty-notes", version: 1, notes: [note] };
        assert.isNotEmpty(schemaErrors(doc));
        assert.lengthOf(notesHarness().session.notes.mergeDocument(doc).skipped, 1);
    });
});

describe("format review: note-16", () => {
    it("a note on { node: 11 } opened on CSV data whose id is the text 11 reads present", async () => {
        const session = createGraphSession();
        await session.execute({
            op: "data.import",
            source: { type: "csv", config: { data: "source,target\n11,12\n" } },
            mode: "replace",
        });
        session.notes.mergeDocument({
            kind: "graphty-notes",
            version: 1,
            notes: [{ id: "note_n", time: "2026-10-01T09:00:00Z", targets: [{ node: 11 }], text: "x" }],
        });
        assert.strictEqual(session.notes.status("note_n").targets[0].state, "present");
        session.dispose();
    });
});
