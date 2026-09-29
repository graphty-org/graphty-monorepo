/**
 * @file Graph additions and attribute edits as undoable steps, on a session with no renderer.
 *
 * Undo and redo write the values an add resolved when it ran -- ids, endpoints, weights, the
 * element-assigned edge ids, the file coordinates -- straight back into the builder and the
 * `graph` slice, and never read records through ingest again. A write with no command is refused
 * under strict state. The renderer half (events, layout and camera) is
 * `test/browser/history-graph-add.test.ts`.
 */

import { assert, describe, it, vi } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import { Ingest } from "../../../src/session/project/ingest";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { fixtureSession } from "./fixture-session";

/**
 * The node ids in row order.
 * @param session - The session.
 * @returns The ids.
 */
function nodeOrder(session: GraphSession): unknown[] {
    return session.snapshot().ids.toArray();
}

/**
 * Every edge as `source>target#id`, in row order.
 * @param session - The session.
 * @returns The edges.
 */
function edgeOrder(session: GraphSession): string[] {
    const snapshot = session.snapshot();
    return Array.from(
        { length: snapshot.edgeCount },
        (_, edge) =>
            `${String(snapshot.ids.idOf(snapshot.edgeSource(edge)))}>${String(snapshot.ids.idOf(snapshot.edgeTarget(edge)))}` +
            `#${String(snapshot.edges.value("graphty.edgeId", edge))}`,
    );
}

/**
 * The digest of everything a project holds, rows included.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return stateDigest(dispatcherOf(session).state, { snapshot: session.snapshot() });
}

describe("adding nodes and edges as steps", () => {
    it("records one labelled step, and undo and redo move the rows and the records", async () => {
        const session = await fixtureSession();
        const before = digest(session);

        await session.data.addNodes([{ id: "n4", name: "four" }]);

        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Added a node"],
        );
        assert.strictEqual(session.data.node("n4")?.name, "four");

        await session.undo();
        assert.isUndefined(session.data.node("n4"));
        assert.deepEqual(nodeOrder(session), ["n1", "n2", "n3"]);
        assert.strictEqual(digest(session), before);

        await session.redo();
        assert.strictEqual(session.data.node("n4")?.name, "four");
        assert.deepEqual(nodeOrder(session), ["n1", "n2", "n3", "n4"]);
        session.dispose();
    });

    it("undo removes exactly the ids it added, by id, when rows were appended after them", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        // Rows appended after the step, by a writer outside this history.
        harness.add([{ id: "later" }]);

        await session.undo();

        assert.deepEqual(nodeOrder(session), ["later"], "the added ids went, and only they");
        session.dispose();
    });

    it("redo reuses the edge ids the add assigned, and the counter is never wound back", async () => {
        const session = await fixtureSession();
        await session.data.addEdges([{ src: "n3", dst: "n1" }]);
        assert.deepEqual(edgeOrder(session), ["n1>n2#0", "n2>n3#1", "n3>n1#2"]);

        await session.undo();
        assert.deepEqual(edgeOrder(session), ["n1>n2#0", "n2>n3#1"]);
        await session.redo();
        assert.deepEqual(edgeOrder(session), ["n1>n2#0", "n2>n3#1", "n3>n1#2"]);
        assert.strictEqual(session.data.edge("2")?.source, "n3");

        await session.data.addEdges([{ src: "n1", dst: "n3" }]);
        assert.strictEqual(edgeOrder(session).at(-1), "n1>n3#3");
        session.dispose();
    });

    it("undo removes the endpoints an edge created, and redo brings them back", async () => {
        const session = await fixtureSession();
        await session.data.addEdges([{ src: "n3", dst: "n9" }]);
        assert.deepEqual(nodeOrder(session), ["n1", "n2", "n3", "n9"]);

        await session.undo();
        assert.deepEqual(nodeOrder(session), ["n1", "n2", "n3"]);
        await session.redo();
        assert.deepEqual(nodeOrder(session), ["n1", "n2", "n3", "n9"]);
        session.dispose();
    });

    it("undo and redo write resolved values and never read the records through ingest again", async () => {
        const session = await fixtureSession();
        // A repeat folded into the edge it repeats, under a policy named for this call alone.
        await session.execute({
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ src: "n1", dst: "n2", weight: 3 }], repeated: "sum" },
        });
        const added = digest(session);
        const nodes = vi.spyOn(Ingest.prototype, "addNodes");
        const edges = vi.spyOn(Ingest.prototype, "addEdges");
        try {
            await session.undo();
            await session.redo();

            assert.strictEqual(digest(session), added, "the same rows, weights and records");
            assert.strictEqual(nodes.mock.calls.length + edges.mock.calls.length, 0, "ingest was not asked");
        } finally {
            nodes.mockRestore();
            edges.mockRestore();
        }

        session.dispose();
    });

    it("a redone add lands at the coordinates its record carried", async () => {
        const session = await fixtureSession();
        await session.data.addNodes([{ id: "n4", position: [1, 2, 3] }]);
        await session.undo();
        await session.redo();

        const snapshot = session.snapshot();
        const out = { x: 0, y: 0, z: 0 };
        session.positions.read(snapshot.ids.indexOf("n4"), out);
        assert.deepEqual(out, { x: 1, y: 2, z: 3 });
        session.dispose();
    });

    it("skips an id the graph already holds, and records nothing when nothing was added", async () => {
        const session = await fixtureSession();
        const before = digest(session);

        await session.data.addNodes([{ id: "n1", name: "again" }]);

        assert.strictEqual(session.history.steps.length, 0);
        assert.strictEqual(digest(session), before);
        session.dispose();
    });
});

describe("editing attributes as steps", () => {
    it("patches only the keys named, and undo puts back the record it replaced", async () => {
        const session = await fixtureSession();
        await session.data.updateNodes([{ id: "n1", values: { name: "one" } }]);
        await session.data.updateNodes([{ id: "n1", values: { type: "hub" } }]);
        assert.deepInclude(session.data.node("n1"), { name: "one", type: "hub" });

        await session.undo();
        assert.deepInclude(session.data.node("n1"), { name: "one" });
        assert.notProperty(session.data.node("n1"), "type");
        await session.undo();
        assert.notProperty(session.data.node("n1"), "name");
        session.dispose();
    });

    it("edits edges by their element-assigned id", async () => {
        const session = await fixtureSession();
        await session.data.updateEdges([{ id: "1", values: { kind: "next" } }]);
        assert.strictEqual(session.data.edge("1")?.kind, "next");

        await session.undo();
        assert.notProperty(session.data.edge("1"), "kind");
        session.dispose();
    });

    it("records nothing for an id the graph does not hold", async () => {
        const session = await fixtureSession();
        await session.data.updateNodes([{ id: "nobody", values: { name: "x" } }]);
        assert.strictEqual(session.history.steps.length, 0);
        session.dispose();
    });
});

describe("writes that do not come through the dispatcher", () => {
    it("refuses a primitive called with no command, under strict state", async () => {
        const session = await fixtureSession();
        assert.throws(() => dispatcherOf(session).graph.writer(null, session.data.store as never), /outside a command/);
        session.dispose();
    });
});
