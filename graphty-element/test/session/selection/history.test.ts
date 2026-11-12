/**
 * @file Undo and redo select what changed. A step that names elements -- an addition, a removal,
 * an attribute edit, a pin -- leaves those elements selected once it is undone or redone; a step
 * that names none (a style, a filter, a run) and a step touching more elements than the selection
 * cap leave the selection as it was. Selection itself is never state: changing it never changes
 * the project digest.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
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

/**
 * A file, as a dropped file arrives.
 * @param text - its text
 * @param name - its name
 * @returns the source
 */
const csv = (text: string, name: string): { config: { file: File }; name: string } => ({
    config: { file: new File([text], name) },
    name,
});

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

    it("undoing or redoing a type change, a join or a replace leaves the selection unchanged", async () => {
        const session = createGraphSession();
        await (await session.data.prepare(csv("id,amount\nv0,1\nv1,2\nv2,3\nv3,N/A", "nodes.csv"))).load();
        await (
            await session.data.prepare(csv("from,to,w\nv0,v1,1\nv1,v2,2\nv2,v3,3", "edges.csv"))
        ).load({
            mode: "merge",
        });

        await session.data.setType({ kind: "node", name: "amount" }, "number");
        const join = await session.data.prepare(csv("id,tier\nv0,a\nv1,b\nv2,c", "tiers.csv"), { onto: "graph" });
        await join.load({ join: { keys: join.suggestJoin().keys } });
        const edges = session.data.sources().find((each) => each.name === "edges.csv");
        assert.isDefined(edges);
        await session.data.replaceSource(edges.key, csv("from,to,w\nv0,v1,9\nv2,v3,3\nv3,v0,4", "edges-2.csv"));
        const added = session.data.edges().find((each) => each.source === "v3" && each.target === "v0");
        assert.isDefined(added);
        await session.selection.apply({ nodes: ["v3"], edges: [added.id] });
        const changes = selectionChanges(session);

        await session.undo(); // the replace: the selected edge goes with the newer copy
        assert.deepEqual([...session.selection.nodes], ["v3"]);
        assert.lengthOf(session.selection.edges, 0, "an edge that no longer exists is not selected");
        await session.undo(); // the join
        await session.undo(); // the type change
        await session.redo();
        await session.redo();
        await session.redo();

        assert.deepEqual([...session.selection.nodes], ["v3"]);
        assert.isTrue(
            changes.every((delta) => delta.cause !== "history"),
            "no undo or redo of a dataset-wide step selects what it changed",
        );
        session.dispose();
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
