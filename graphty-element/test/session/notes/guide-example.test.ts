/**
 * @file The runnable examples of the "Notes" guide (`docs/guide/notes.md`), kept here so the
 * documented code keeps working. Each test is the guide's code on a standalone session, with its
 * comments turned into assertions; the guide reaches the same session as `element.session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError, type NoteChange } from "../../../session";
import type { ElementSession } from "../../../src/session/types";

/**
 * The repaint label a node ended up with.
 * @param session - The session.
 * @param id - The node.
 * @returns The label, or undefined.
 */
function labelOf(session: GraphSession, id: string): unknown {
    const painted = session as ElementSession;
    return painted.paint.styleOf("node", painted.snapshot().ids.indexOf(id))["node.label"];
}

describe("the notes guide's examples", () => {
    it("the quick start: write, list, label, save and open", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);

        // Write a note about a node, then read the notes about it, newest first
        const id = session.notes.add({ text: "Wrote the first program.", targets: [{ node: "ada" }] });
        const aboutAda = session.notes.list({ target: { node: "ada" } });
        assert.deepEqual(
            aboutAda.map((note) => note.id),
            [id],
        );
        assert.match(id, /^note_/);
        assert.match(aboutAda[0].time, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);

        // Label every node that has a note with its newest note
        await session.styles.add({
            name: "Notes",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            encode: { "node.label": { by: "graphty.notes.latest" } },
        });
        await session.styles.settled();
        assert.strictEqual(labelOf(session, "ada"), "Wrote the first program.");
        assert.isUndefined(labelOf(session, "grace"), "a node without notes is left alone");

        // Save the notes as JSON, and open them again later
        const saved = JSON.stringify(session.notes.toDocument());
        const later = createGraphSession();
        later.notes.mergeDocument(JSON.parse(saved));
        assert.deepEqual(later.notes.get(id), session.notes.get(id), "the same id, time and text");

        session.dispose();
        later.dispose();
    });

    it("refuses a blank note with a reason, and stamps the author setting", async () => {
        const session = createGraphSession();
        let reason: unknown;
        try {
            session.notes.add({ text: "  ", targets: [{ node: "ada" }] });
        } catch (error) {
            if (!isGraphtyError(error)) {
                throw error;
            }
            reason = error.details?.reason;
        }
        assert.strictEqual(reason, "empty-text");
        assert.lengthOf(session.notes.list(), 0, "a refused write changes nothing");

        await session.config.set({ author: "Ada" });
        const signed = session.notes.add({ text: "Signed.", targets: [{ graph: true }] });
        await session.config.set({ author: null });
        const unsigned = session.notes.add({ text: "Unsigned.", targets: [{ graph: true }] });
        assert.strictEqual(session.notes.get(signed)?.author, "Ada");
        assert.notProperty(session.notes.get(unsigned), "author");
        assert.deepEqual(session.notes.authors(), ["Ada"]);
        session.dispose();
    });

    it("reports what a note points at, follows the data, and undoes like everything else", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }]);
        const changes: NoteChange["change"][] = [];
        const stop = session.on("note:changed", ({ change }) => changes.push(change));

        // A note about a node the graph does not hold yet is kept, and reads "missing"
        const id = session.notes.add({ text: "Same person?", targets: [{ node: "ada" }, { node: "lovelace" }] });
        assert.deepEqual(
            session.notes.status(id).targets.map((target) => target.state),
            ["present", "missing"],
        );
        await session.data.addNodes([{ id: "lovelace" }]);
        assert.strictEqual(session.notes.status(id).targets[1].state, "present", "found again when it arrives");

        // Select what the note is about
        const delta = await session.selection.apply({ note: id });
        assert.deepEqual([...session.selection.nodes].sort(), ["ada", "lovelace"]);
        assert.strictEqual(delta.skipped, 0);

        session.notes.update(id, { text: "The same person." });
        assert.isString(session.notes.get(id)?.edited);
        await session.undo();
        assert.strictEqual(session.notes.get(id)?.text, "Same person?");
        session.notes.remove(id);
        await session.undo();
        assert.strictEqual(session.notes.get(id)?.text, "Same person?", "back with the same id");

        stop();
        assert.deepEqual(changes, ["created", "updated", "updated", "removed", "created"]);
        assert.deepEqual(session.notes.counts(), { notes: 1, nodes: 2, edges: 0 });
        session.dispose();
    });
});
