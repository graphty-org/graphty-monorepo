/**
 * @file Undo and redo select what changed. A step that names elements -- an addition, a removal,
 * an attribute edit, a pin -- leaves those elements selected once it is undone or redone; a step
 * that names none (a style, a filter, a run) and a step touching more elements than the selection
 * cap leave the selection as it was. Selection itself is never state: changing it never changes
 * the project digest.
 */

import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { SelectionDelta } from "../../../src/session/selection";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

/**
 * A session over a chain `v0 -> v1 -> ...` with an empty history.
 * @param count - How many nodes.
 * @returns The session.
 */
async function chain(count: number): Promise<GraphSession> {
    const { session } = makeSession();
    const ids = Array.from({ length: count }, (_, at) => `v${String(at)}`);
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id })));
    session.history.clear();
    return session;
}

/**
 * Every selection change a session publishes, from now on.
 * @param session - The session.
 * @returns The deltas, growing.
 */
function selectionChanges(session: GraphSession): SelectionDelta[] {
    const seen: SelectionDelta[] = [];
    session.on("selection:changed", (delta) => {
        seen.push(delta);
    });
    return seen;
}

describe("selection after undo and redo", () => {
    it("undoing a removal selects the restored nodes and their edges", async () => {
        const session = await chain(5);
        await session.selection.apply({ nodes: ["v0"] });
        await session.data.removeNodes(["v2"]);
        const changes = selectionChanges(session);

        await session.undo();

        assert.deepEqual([...session.selection.nodes], ["v2"]);
        assert.strictEqual(session.selection.edges.length, 2);
        assert.deepEqual(
            changes.map((delta) => delta.cause),
            ["history"],
        );

        // Redoing the removal selects what it removed, which no longer exists: nothing.
        await session.redo();
        assert.strictEqual(session.selection.size, 0);
    });

    it("undoing an attribute edit selects the edited node", async () => {
        const session = await chain(3);
        await session.data.updateNodes([{ id: "v1", values: { name: "middle" } }]);
        await session.selection.apply({ nodes: ["v0"] });

        await session.undo();

        assert.deepEqual([...session.selection.nodes], ["v1"]);
    });

    it("undoing a style edit leaves the selection unchanged", async () => {
        const session = await chain(3);
        await session.selection.apply({ nodes: ["v0", "v2"] });
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        const before = session.selection.nodes;
        const changes = selectionChanges(session);

        await session.undo();
        await session.redo();

        assert.strictEqual(session.selection.nodes, before);
        assert.lengthOf(changes, 0);
    });

    it("a step touching more elements than the cap leaves the selection unchanged", async () => {
        const session = await chain(3);
        const many = Array.from({ length: session.selection.cap + 1 }, (_, at) => ({ id: `m${String(at)}` }));
        await session.data.addNodes(many);
        await session.data.removeNodes(many.map((node) => node.id));
        await session.selection.apply({ nodes: ["v1"] });
        const changes = selectionChanges(session);

        await session.undo();

        assert.deepEqual([...session.selection.nodes], ["v1"]);
        assert.lengthOf(changes, 0);
    });

    it("clearing, undone, leaves the selection unchanged", async () => {
        const session = await chain(3);
        await session.data.clear();
        const changes = selectionChanges(session);

        await session.undo();

        assert.lengthOf(changes, 0);
        assert.strictEqual(session.selection.size, 0);
    });

    it("selection never changes the digest", async () => {
        const session = await chain(4);
        const digest = (): string => stateDigest(dispatcherOf(session).state, { snapshot: session.snapshot() });
        const before = digest();
        const steps = session.history.steps.length;

        await session.selection.apply({ nodes: ["v1", "v3"] });
        assert.strictEqual(digest(), before);
        session.selection.clear();
        assert.strictEqual(digest(), before);
        assert.strictEqual(session.history.steps.length, steps);
    });
});
