/**
 * @file `selection.previous()` keeps what the last emptying took away, and `selection.restore()`
 * selects it again: exactly those nodes and edges, with no undo step, and only the ones the graph
 * still holds.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

/**
 * A session over a chain `v0 -> v1 -> v2 -> v3`, with v1, v2 and the edge between them selected.
 * @returns The session.
 */
async function picked(): Promise<GraphSession> {
    const { session } = makeSession();
    const ids = ["v0", "v1", "v2", "v3"];
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id })));
    await session.selection.apply({ nodes: ["v1", "v2"] });
    await session.selection.apply({ edgesBetween: true }, "add");
    assert.lengthOf(session.selection.edges, 1, "the edge between v1 and v2 is selected");
    return session;
}

describe("bringing back a cleared selection", () => {
    it("is null before anything selected was emptied", async () => {
        const session = await picked();
        assert.isNull(session.selection.previous());
        const delta = session.selection.restore();
        assert.deepEqual([...delta.added, ...delta.removed], [], "restore with nothing kept changes nothing");
        assert.sameMembers([...session.selection.nodes], ["v1", "v2"]);
    });

    it("restore brings back exactly the cleared nodes and edges, with no undo step", async () => {
        const session = await picked();
        const edges = [...session.selection.edges];
        const steps = session.history.steps.length;
        const { position } = session.history;

        session.selection.clear({ cause: "user" });
        assert.strictEqual(session.selection.size, 0);
        assert.deepEqual(session.selection.previous(), { nodes: ["v1", "v2"], edges });

        const delta = session.selection.restore({ cause: "user" });
        assert.strictEqual(delta.cause, "user");
        assert.sameMembers([...session.selection.nodes], ["v1", "v2"]);
        assert.sameMembers([...session.selection.edges], edges);
        assert.strictEqual(session.history.steps.length, steps, "no undo step was recorded");
        assert.strictEqual(session.history.position, position);
    });

    it("a replace that selects nothing keeps what it took, and a new selection leaves it alone", async () => {
        const session = await picked();
        await session.selection.apply({ nodes: [] });
        await session.selection.apply({ nodes: ["v3"] });
        assert.deepEqual(session.selection.previous()?.nodes, ["v1", "v2"]);

        session.selection.restore();
        assert.sameMembers([...session.selection.nodes], ["v1", "v2"], "restore replaces what is selected now");
    });

    it("drops what the graph no longer holds, and is null once nothing is left", async () => {
        const session = await picked();
        session.selection.clear();
        await session.data.removeNodes(["v1"]);
        // The edge v1 -> v2 went with v1.
        assert.deepEqual(session.selection.previous(), { nodes: ["v2"], edges: [] });

        session.selection.restore();
        assert.deepEqual([...session.selection.nodes], ["v2"]);

        session.selection.clear();
        await session.data.removeNodes(["v2"]);
        assert.isNull(session.selection.previous());
        session.selection.restore();
        assert.strictEqual(session.selection.size, 0);
    });
});
