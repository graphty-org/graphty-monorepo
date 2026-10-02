/**
 * @file Notes under undo and redo: each write is one labeled step, undo and redo put back the
 * very same records (id, time and author included), and a transaction groups note writes with
 * other changes into one step.
 */

import { assert, describe, it } from "vitest";

import { notesHarness } from "./harness";

describe("notes and the history", () => {
    it("labels each write, and undo and redo give back the same records", async () => {
        const { session } = notesHarness();
        await session.config.set({ author: "Ada" });
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        const added = session.notes.get(id);
        session.notes.update(id, { text: "y" });
        const edited = session.notes.get(id);
        session.notes.remove(id);

        assert.deepEqual(
            session.history.steps.slice(-3).map((step) => step.label),
            ["Added note", "Edited note", "Removed note"],
        );
        assert.deepEqual(session.history.steps.at(-1)?.slices, ["notes"]);

        await session.undo();
        assert.strictEqual(session.notes.get(id), edited, "remove undone: the edited record");
        await session.undo();
        assert.strictEqual(session.notes.get(id), added, "update undone: the record as added");
        await session.undo();
        assert.isUndefined(session.notes.get(id), "add undone: gone");

        await session.redo();
        const redone = session.notes.get(id);
        assert.strictEqual(redone, added, "redo brings back the same id, time and author");
        assert.strictEqual(redone?.author, "Ada");
        await session.redo();
        assert.strictEqual(session.notes.get(id), edited);
    });

    it("groups note writes made through tx.notes with a set write into one step", async () => {
        const { session } = notesHarness();
        const steps = session.history.steps.length;
        const ids = await session.transaction("Mark the core", (tx) => {
            const set = tx.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
            const first = tx.notes.add({ text: "core", targets: [{ set }] });
            const second = tx.notes.add({ text: "a", targets: [{ node: "a" }] });
            tx.notes.update(first, { text: "the core" });
            return [first, second];
        });

        assert.strictEqual(session.history.steps.length, steps + 1);
        const step = session.history.steps.at(-1);
        assert.strictEqual(step?.label, "Mark the core");
        assert.sameMembers([...(step?.slices ?? [])], ["sets", "notes"]);
        assert.strictEqual(session.notes.get(ids[0])?.text, "the core");

        await session.undo();
        assert.deepEqual(session.notes.list(), []);
        assert.deepEqual(session.sets.list(), []);
    });

    it("rolls back every note write of a transaction that throws", async () => {
        const { session } = notesHarness();
        const failed = await session
            .transaction("Fails", (tx) => {
                tx.notes.add({ text: "x", targets: [{ node: "a" }] });
                throw new Error("no");
            })
            .then(
                () => null,
                (error: unknown) => (error as Error).message,
            );

        assert.strictEqual(failed, "no");
        assert.deepEqual(session.notes.list(), []);
    });
});
