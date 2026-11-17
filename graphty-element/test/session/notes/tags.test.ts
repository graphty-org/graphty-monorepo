/**
 * @file A note's tags: `add` and `update` take them, `list({ tag })` filters on them, `tags()`
 * lists the ones in use, `note:changed` names them, and the `graphty-notes` member saves and reads
 * them.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import type { NoteChange } from "../../../src/session/notes/types";
import { notesHarness, refusalOf } from "./harness";

const schemaUrl = new URL("../../../../design/documents/notes.schema.json", import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
// ajv-formats is CommonJS: its default export arrives as the module object under Node.
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaUrl, "utf8")) as object);

describe("a note's tags", () => {
    it("keeps each tag once, and an empty list as no tags", () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }], tags: ["lead", "lead", "open"] });
        assert.deepEqual(session.notes.get(id)?.tags, ["lead", "open"]);
        const bare = session.notes.add({ text: "y", targets: [{ node: "a" }], tags: [] });
        assert.notProperty(session.notes.get(bare), "tags");
    });

    it("refuses tags that are not a list of non-blank strings, or more than 64", () => {
        const { session } = notesHarness();
        const add = (tags: unknown): unknown =>
            refusalOf(() => session.notes.add({ text: "x", targets: [{ node: "a" }], tags } as never))?.details;
        assert.strictEqual((add("lead") as { reason: string }).reason, "bad-tags");
        assert.strictEqual((add([" "]) as { reason: string }).reason, "bad-tags");
        assert.strictEqual((add([1]) as { reason: string }).reason, "bad-tags");
        assert.deepInclude(add(Array.from({ length: 65 }, (_, index) => `t${String(index)}`)) as object, {
            reason: "too-many",
            field: "tags",
        });
        assert.strictEqual(session.notes.list().length, 0);
    });

    it("replaces and clears tags as one undoable edit, named in note:changed", async () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }], tags: ["lead"] });
        const changes: NoteChange[] = [];
        session.on("note:changed", (change) => changes.push(change));

        const before = session.notes.get(id);
        session.notes.update(id, { tags: ["lead"] });
        assert.strictEqual(session.notes.get(id), before, "the same tags change nothing");

        session.notes.update(id, { tags: ["lead", "checked"] });
        assert.deepEqual(session.notes.get(id)?.tags, ["lead", "checked"]);
        assert.deepEqual(session.history.steps.at(-1)?.fact, { code: "note.update", params: {} });
        session.notes.update(id, { tags: null });
        assert.notProperty(session.notes.get(id), "tags");
        await session.undo();
        assert.deepEqual(session.notes.get(id)?.tags, ["lead", "checked"]);

        assert.deepEqual(
            changes.map((change) => [change.fields, change.cause]),
            [
                [["tags"], "command"],
                [["tags"], "command"],
                [["tags"], "undo"],
            ],
        );
    });

    it("filters list on a tag, and lists the tags in use in the order of their first note", () => {
        const { session } = notesHarness();
        const first = session.notes.add({ text: "1", targets: [{ node: "a" }], tags: ["lead", "open"] });
        const second = session.notes.add({ text: "2", targets: [{ node: "a" }], tags: ["checked", "lead"] });
        session.notes.add({ text: "3", targets: [{ node: "a" }] });

        assert.deepEqual(
            session.notes.list({ tag: "lead" }).map((note) => note.id),
            [second, first],
        );
        assert.deepEqual(
            session.notes.list({ tag: "open" }).map((note) => note.id),
            [first],
        );
        assert.deepEqual(session.notes.list({ tag: "nope" }), []);
        assert.deepEqual(session.notes.tags(), ["lead", "open", "checked"]);
    });

    it("saves tags last of the named fields, and reads them back on a fresh session", () => {
        const first = notesHarness().session;
        const id = first.notes.add({ text: "x", targets: [{ node: "a" }], tags: ["lead"] });
        first.notes.update(id, { done: true });
        const saved = first.notes.toDocument();

        assert.isTrue(validate(saved), JSON.stringify(validate.errors));
        assert.deepEqual(Object.keys(saved.notes[0]).slice(-2), ["done", "tags"]);

        const second = notesHarness().session;
        const report = second.notes.mergeDocument(JSON.parse(JSON.stringify(saved)));
        assert.deepEqual(report.notices, [], "tags is a known field, not an unknown one");
        assert.deepEqual(second.notes.get(id)?.tags, ["lead"]);
        assert.strictEqual(second.notes.mergeDocument(JSON.parse(JSON.stringify(saved))).unchanged, 1);
    });

    it("skips a saved note whose tags are not a list of strings", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument({
            kind: "graphty-notes",
            version: 1,
            notes: [
                {
                    id: "note_01JV0000000000000000000001",
                    time: "2026-10-01T09:00:00.000Z",
                    targets: [{ node: "a" }],
                    text: "x",
                    tags: "lead",
                },
            ],
        });
        assert.deepEqual(report.added, []);
        assert.strictEqual(report.skipped[0]?.what, "/notes/0");
    });
});
