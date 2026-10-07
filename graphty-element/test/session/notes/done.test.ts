/**
 * @file A note's done state: `update(id, { done })` marks and clears it as one undoable step,
 * `note:changed` names it, `list({ done })` filters on it, and the `graphty-notes` member saves
 * and reads it, while a member written before it existed still loads.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import type { NoteChange, NotesDocument } from "../../../src/session/notes/types";
import { notesHarness, refusalOf } from "./harness";

const schemaUrl = new URL("../../../../design/documents/notes.schema.json", import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
// ajv-formats is CommonJS: its default export arrives as the module object under Node.
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaUrl, "utf8")) as object);

/** A member as a release without the done state wrote it. */
const VERSION_1_MEMBER: NotesDocument = {
    kind: "graphty-notes",
    version: 1,
    notes: [
        {
            id: "note_01JV0000000000000000000001",
            time: "2026-10-01T09:00:00.000Z",
            targets: [{ node: "a" }],
            text: "Wrote the first program.",
            author: "Ada",
            edited: "2026-10-01T10:00:00.000Z",
        },
    ],
};

describe("a note's done state", () => {
    it("marks and clears done as one undoable step each, keeping the first time it was marked", async () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        assert.isUndefined(session.notes.get(id)?.done, "a new note is not done");

        session.notes.update(id, { done: true });
        const done = session.notes.get(id);
        assert.isString(done?.done);
        assert.strictEqual(done?.edited, done?.done, "marking done is an edit, stamped once");
        assert.strictEqual(session.history.steps.at(-1)?.label, "Edited note");

        const steps = session.history.steps.length;
        session.notes.update(id, { done: true });
        assert.strictEqual(session.notes.get(id), done, "done again changes nothing");
        assert.strictEqual(session.history.steps.length, steps, "and records nothing");

        session.notes.update(id, { done: false });
        assert.isUndefined(session.notes.get(id)?.done);
        assert.notProperty(session.notes.get(id), "done", "a cleared field is absent");

        await session.undo();
        assert.strictEqual(session.notes.get(id), done, "undo puts the done record back");
        await session.undo();
        assert.isUndefined(session.notes.get(id)?.done, "undo of the marking clears it");
        await session.redo();
        assert.strictEqual(session.notes.get(id), done, "redo gives back the same record");
    });

    it("refuses done on add and a done that is not a boolean", () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        assert.strictEqual(
            refusalOf(() => session.notes.add({ text: "x", targets: [{ node: "a" }], done: true } as never))?.details
                .reason,
            "unknown-field",
        );
        assert.strictEqual(
            refusalOf(() => session.notes.update(id, { done: "yes" } as never))?.details.reason,
            "bad-done",
        );
        assert.isUndefined(session.notes.get(id)?.done);
    });

    it("names done in note:changed", async () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        const changes: NoteChange[] = [];
        session.on("note:changed", (change) => changes.push(change));

        session.notes.update(id, { done: true });
        session.notes.update(id, { done: true, text: "y" });
        await session.undo();

        assert.deepEqual(
            changes.map((change) => [change.fields, change.cause]),
            [
                [["done"], "command"],
                [["text"], "command"],
                [["text"], "undo"],
            ],
        );
    });

    it("filters list on done", () => {
        const { session } = notesHarness();
        const open = session.notes.add({ text: "open", targets: [{ node: "a" }] });
        const closed = session.notes.add({ text: "closed", targets: [{ node: "a" }] });
        session.notes.update(closed, { done: true });

        const ids = (done?: boolean): string[] => session.notes.list({ done }).map((note) => note.id);
        assert.deepEqual(ids(true), [closed]);
        assert.deepEqual(ids(false), [open]);
        assert.sameMembers(ids(), [open, closed]);
        assert.deepEqual(
            session.notes.list({ target: { node: "a" }, done: false }).map((note) => note.id),
            [open],
        );
    });

    it("saves done after extensions, and reads it back on a fresh session", () => {
        const first = notesHarness().session;
        const id = first.notes.add({ text: "x", targets: [{ node: "a" }], extensions: { "com.example.app": 1 } });
        first.notes.update(id, { done: true });
        const saved = first.notes.toDocument();
        const [note] = saved.notes;

        assert.isTrue(validate(saved), JSON.stringify(validate.errors));
        assert.strictEqual(saved.version, 1, "an optional field stays in version 1");
        assert.deepEqual(Object.keys(note).slice(-2), ["extensions", "done"]);

        const second = notesHarness().session;
        const report = second.notes.mergeDocument(JSON.parse(JSON.stringify(saved)));
        assert.deepEqual(report.added, [id]);
        assert.deepEqual(report.notices, [], "done is a known field, not an unknown one");
        assert.strictEqual(second.notes.get(id)?.done, note.done);
        assert.deepEqual(
            second.notes.list({ done: true }).map((read) => read.id),
            [id],
        );
        assert.strictEqual(
            second.notes.mergeDocument(JSON.parse(JSON.stringify(saved))).unchanged,
            1,
            "opening it again changes nothing",
        );
    });

    it("loads a member written before done existed, as not done, and writes it back the same", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument(structuredClone(VERSION_1_MEMBER));
        const [id] = report.added;

        assert.deepEqual([report.skipped, report.notices], [[], []]);
        assert.isUndefined(session.notes.get(id)?.done);
        assert.deepEqual(
            session.notes.list({ done: false }).map((note) => note.id),
            [id],
        );
        assert.deepEqual(session.notes.toDocument(), VERSION_1_MEMBER);
    });

    it("skips a saved note whose done is not a time", () => {
        const { session } = notesHarness();
        const [note] = VERSION_1_MEMBER.notes;
        const report = session.notes.mergeDocument({ ...VERSION_1_MEMBER, notes: [{ ...note, done: true }] });
        assert.deepEqual(report.added, []);
        assert.strictEqual(report.skipped[0]?.what, "/notes/0");
    });
});
