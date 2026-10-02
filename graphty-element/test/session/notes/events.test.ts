/**
 * @file `note:changed`: one event per note a write touched, after the write, with the change,
 * the fields an update touched, the record and the cause; nothing for a refused write or a
 * write that changed nothing.
 */

import { assert, describe, it } from "vitest";

import type { NoteChange } from "../../../src/session/notes/types";
import { notesHarness } from "./harness";

/**
 * The parts of a change a test compares.
 * @param change - The change.
 * @returns Its id, change, fields and cause.
 */
function brief(change: NoteChange): [string, string, readonly string[], string] {
    return [change.id, change.change, change.fields, change.cause];
}

describe("note:changed", () => {
    it("tells each write once, with its fields, record and cause", async () => {
        const { session } = notesHarness();
        const changes: NoteChange[] = [];
        session.on("note:changed", (change) => changes.push(change));

        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        assert.lengthOf(changes, 1, "published synchronously, after the write");
        assert.strictEqual(changes[0].note, session.notes.get(id));

        session.notes.update(id, { text: "y", extensions: { "com.example.app": 1 } });
        session.notes.update(id, { text: "y" });
        session.notes.update(id, { targets: [{ node: "b" }] });
        session.notes.remove(id);
        await session.undo();
        await session.redo();

        assert.deepEqual(changes.map(brief), [
            [id, "created", [], "command"],
            [id, "updated", ["text", "extensions"], "command"],
            [id, "updated", ["targets"], "command"],
            [id, "removed", [], "command"],
            [id, "created", [], "undo"],
            [id, "removed", [], "redo"],
        ]);
        assert.isNull(changes[3].note);
        assert.isTrue(Object.isFrozen(changes[1]) && Object.isFrozen(changes[1].fields));
    });

    it("tells a transaction's notes once each, when it commits", async () => {
        const { session } = notesHarness();
        const changes: NoteChange[] = [];
        session.on("note:changed", (change) => changes.push(change));

        await session.transaction("Two notes", (tx) => {
            const first = tx.notes.add({ text: "x", targets: [{ node: "a" }] });
            tx.notes.add({ text: "y", targets: [{ node: "b" }] });
            tx.notes.update(first, { text: "z" });
        });

        assert.deepEqual(
            changes.map((change) => [change.change, change.note?.text]),
            [
                ["created", "z"],
                ["created", "y"],
            ],
        );
    });
});
