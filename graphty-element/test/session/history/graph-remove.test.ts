/**
 * @file Removing nodes and edges, and clearing, as undoable steps, on a session with no renderer.
 *
 * Undo puts removed rows back at the rows they held, so node order, edge order and the snapshot
 * fingerprint come back equal; it writes the endpoints, weights, edge ids and column values the
 * removal recorded, never re-reading them through ingest; and a burst of undos folds into one
 * rebuild of the builder, paid at the next read.
 */

import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
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
 * Every edge as `source>target#id@weight`, in row order.
 * @param session - The session.
 * @returns The edges.
 */
function edgeOrder(session: GraphSession): string[] {
    const snapshot = session.snapshot();
    const { weights, edgeToArc } = snapshot;
    return Array.from({ length: snapshot.edgeCount }, (_, edge) => {
        const source = String(snapshot.ids.idOf(snapshot.edgeSource(edge)));
        const target = String(snapshot.ids.idOf(snapshot.edgeTarget(edge)));
        const weight = weights === null ? 1 : weights[edgeToArc[edge]];
        return `${source}>${target}#${String(snapshot.edges.value("graphty.edgeId", edge))}@${String(weight)}`;
    });
}

/**
 * The digest of everything a project holds, rows included.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return stateDigest(dispatcherOf(session).state, { snapshot: session.snapshot() });
}

/**
 * A session over a chain of `count` nodes, `v0 -> v1 -> ...`, each edge weighted by its index.
 * @param count - How many nodes.
 * @returns The session and its store.
 */
async function chain(count: number): Promise<ReturnType<typeof makeSession>> {
    const harness = makeSession();
    const ids = Array.from({ length: count }, (_, at) => `v${String(at)}`);
    await harness.session.data.addNodes(ids.map((id, at) => ({ id, at })));
    await harness.session.data.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id, weight: at + 1 })));
    harness.session.history.clear();
    return harness;
}

describe("removing rows as steps", () => {
    it("removal from the middle, undone, restores node and edge order and the fingerprint", async () => {
        const { session } = await chain(6);
        const nodes = nodeOrder(session);
        const edges = edgeOrder(session);
        const fingerprint = session.data.fingerprint();
        const before = digest(session);

        await session.data.removeNodes(["v2"]);
        assert.deepEqual(nodeOrder(session), ["v0", "v1", "v3", "v4", "v5"]);
        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Removed a node"],
        );

        await session.undo();
        assert.deepEqual(nodeOrder(session), nodes);
        assert.deepEqual(edgeOrder(session), edges);
        assert.strictEqual(session.data.fingerprint(), fingerprint);
        assert.strictEqual(digest(session), before);
        assert.strictEqual(session.data.node("v2")?.at, 2, "the record came back with the row");

        await session.redo();
        assert.deepEqual(nodeOrder(session), ["v0", "v1", "v3", "v4", "v5"]);
        assert.isUndefined(session.data.edge("1"), "the edges attached to it went with it again");
        session.dispose();
    });

    it("removal of edges from the middle, undone, restores their rows, ids and weights", async () => {
        const { session } = await chain(5);
        const edges = edgeOrder(session);

        await session.data.removeEdges(["1", "2"]);
        assert.deepEqual(edgeOrder(session), ["v0>v1#0@1", "v3>v4#3@4"]);

        await session.undo();
        assert.deepEqual(edgeOrder(session), edges);
        await session.redo();
        assert.deepEqual(edgeOrder(session), ["v0>v1#0@1", "v3>v4#3@4"]);
        session.dispose();
    });

    it("an undone removal writes what it recorded, whatever the repeat policy and weight path say now", async () => {
        const session = await fixtureSession();
        // A parallel edge and a weight read through the configured path.
        await session.data.addEdges([{ src: "n1", dst: "n2", weight: 5, w2: 50 }]);
        const edges = edgeOrder(session);
        await session.config.set({ data: { knownFields: { repeatedEdges: "first", edgeWeightPath: "w2" } } });

        await session.data.removeEdges(["0", "2"]);
        await session.undo();

        assert.deepEqual(edgeOrder(session), edges, "both parallel edges, with the weights they had");
        session.dispose();
    });

    it("removed rows keep their seeds: a restored node is placed where its record put it", async () => {
        const harness = makeSession();
        const { session, store } = harness;
        await session.data.addNodes([
            { id: "a", position: { x: 1, y: 2, z: 3 } },
            { id: "b", position: { x: 4, y: 5, z: 6 } },
            { id: "c", position: { x: 7, y: 8, z: 9 } },
        ]);
        session.history.clear();
        assert.strictEqual(store.seededNodeCount, 3);

        await session.data.removeNodes(["b"]);
        assert.strictEqual(store.seededNodeCount, 2);

        await session.undo();
        assert.strictEqual(store.seededNodeCount, 3, "the seed column came back with the row");
        const at = { x: 0, y: 0, z: 0 };
        store.positions.read(session.snapshot().ids.indexOf("b"), at);
        assert.deepEqual(at, { x: 4, y: 5, z: 6 });
        session.dispose();
    });

    it("thirty mid-row removals undone without awaiting cost one rebuild, at the next read", async () => {
        const { session, store } = await chain(40);
        const nodes = nodeOrder(session);
        const edges = edgeOrder(session);
        for (let at = 0; at < 30; at++) {
            await session.data.removeNodes([`v${String(5 + at)}`]);
        }

        const rebuilds = store.rebuildCount;
        const undone = Array.from({ length: 30 }, () => session.undo());
        await Promise.all(undone);
        assert.strictEqual(store.rebuildCount, rebuilds, "no rebuild before anything read the graph");

        assert.deepEqual(nodeOrder(session), nodes);
        assert.strictEqual(store.rebuildCount, rebuilds + 1, "one rebuild for all thirty");
        assert.deepEqual(edgeOrder(session), edges);
        session.dispose();
    });

    it("undoing an add after undoing a removal, in one move, finds the rows the removal put back", async () => {
        const session = await fixtureSession();
        const edges = edgeOrder(session);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        await session.data.removeNodes(["n1"]);
        assert.deepEqual(edgeOrder(session), ["n2>n3#1@1"]);

        await session.history.restoreTo(null);

        assert.deepEqual(edgeOrder(session), edges, "the added edge went, and only it");
        session.dispose();
    });

    it("an undo and its redo cancel before anything is rebuilt", async () => {
        const { session, store } = await chain(8);
        await session.data.removeNodes(["v3"]);
        session.snapshot();
        const rebuilds = store.rebuildCount;

        await Promise.all([session.undo(), session.redo()]);

        assert.deepEqual(nodeOrder(session), ["v0", "v1", "v2", "v4", "v5", "v6", "v7"]);
        assert.strictEqual(store.rebuildCount, rebuilds);
        session.dispose();
    });

    it("rows removed from the end come back by appending, with no rebuild", async () => {
        const { session, store } = await chain(4);
        await session.data.removeEdges(["2"]);
        session.snapshot();
        const rebuilds = store.rebuildCount;

        await session.undo();

        assert.deepEqual(edgeOrder(session), ["v0>v1#0@1", "v1>v2#1@2", "v2>v3#2@3"]);
        assert.strictEqual(store.rebuildCount, rebuilds);
        session.dispose();
    });
});

describe("clearing as a step", () => {
    it("clears, and undo brings back every row, record and value in order", async () => {
        const { session } = await chain(5);
        const before = digest(session);
        const nodes = nodeOrder(session);
        const edges = edgeOrder(session);

        await session.data.clear();
        assert.strictEqual(session.snapshot().nodeCount, 0);
        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Cleared the graph"],
        );

        await session.undo();
        assert.deepEqual(nodeOrder(session), nodes);
        assert.deepEqual(edgeOrder(session), edges);
        assert.strictEqual(digest(session), before);

        await session.redo();
        assert.strictEqual(session.snapshot().nodeCount, 0);
        assert.strictEqual(session.data.node("v1"), undefined);
        session.dispose();
    });

    it("a graph built after a clear goes, and the cleared one comes back, one undo each", async () => {
        const { session } = await chain(3);
        const nodes = nodeOrder(session);
        await session.data.clear();
        await session.data.addNodes([{ id: "fresh" }]);
        await session.data.addEdges([{ src: "fresh", dst: "other" }]);
        assert.deepEqual(nodeOrder(session), ["fresh", "other"]);
        assert.strictEqual(session.data.edge("2")?.source, "fresh", "the edge counter is never wound back");

        await session.undo();
        await session.undo();
        assert.deepEqual(nodeOrder(session), []);
        await session.undo();
        assert.deepEqual(nodeOrder(session), nodes);

        await session.redo();
        await session.redo();
        await session.redo();
        assert.deepEqual(nodeOrder(session), ["fresh", "other"]);
        session.dispose();
    });
});
