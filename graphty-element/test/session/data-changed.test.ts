/**
 * @file A session with no view (issue #147): attributes come from the graph itself, and every data
 * change publishes `data:changed`.
 */

import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

import { assert, describe, it } from "vitest";

import { createGraphSession, type DataChange, type GraphSession } from "../../session";
import { dispatcherOf } from "../../src/session/GraphSession";

setFlagsFromString("--expose-gc");
const collect = runInNewContext("gc") as () => void;

/**
 * Collect every `data:changed` a session publishes.
 * @param session - the session
 * @returns the events, in order, as they arrive
 */
function heard(session: GraphSession): DataChange[] {
    const out: DataChange[] = [];
    session.on("data:changed", (change) => {
        out.push(change);
    });
    return out;
}

describe("a session with no view", () => {
    it("reads attributes, lists columns and filters by attribute with no record source", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);

        assert.deepInclude(session.data.node("a"), { id: "a", type: "host" });
        assert.isTrue(session.data.attributes().some((column) => column.kind === "node" && column.name === "type"));
        await session.visibility.set({ kind: "categories", attribute: "data.type", values: ["host"] });
        assert.strictEqual(session.visibility.summary.visibleNodes, 1);
        session.dispose();
    });
});

describe("data:changed", () => {
    it("tells the nodes and edges an add puts in, once per change", async () => {
        const session = createGraphSession();
        const events = heard(session);
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "c" }]);

        assert.strictEqual(events.length, 2);
        assert.deepStrictEqual(events[0].added.nodes, ["a", "b"]);
        assert.strictEqual(events[0].cause, "command");
        // The edge brought its missing end in with it.
        assert.deepStrictEqual(events[1].added.nodes, ["c"]);
        assert.strictEqual(events[1].added.edges.length, 1);
        assert.isTrue(Object.isFrozen(events[1]) && Object.isFrozen(events[1].added.nodes));
        session.dispose();
    });

    it("tells an attribute edit by the keys it changed, and a removal by what it took", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", type: "host" },
            { id: "b", type: "host" },
        ]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const [edge] = session.data.edges().map((each) => each.id);
        const events = heard(session);

        await session.data.updateNodes([{ id: "a", values: { type: "service" } }]);
        assert.deepStrictEqual(events.at(-1)?.updated.nodes, ["a"]);
        assert.deepStrictEqual(events.at(-1)?.fields.nodes, ["type"]);
        assert.deepStrictEqual(events.at(-1)?.added, { nodes: [], edges: [] });

        await session.data.removeNodes(["b"]);
        assert.deepStrictEqual(events.at(-1)?.removed, { nodes: ["b"], edges: [edge] });
        assert.strictEqual(events.length, 2);
        session.dispose();
    });

    it("tells an undo, a redo and a load what they did", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const events = heard(session);

        await session.undo();
        assert.deepStrictEqual(events.at(-1)?.removed.nodes, ["a"]);
        assert.strictEqual(events.at(-1)?.cause, "undo");

        await session.redo();
        assert.deepStrictEqual(events.at(-1)?.added.nodes, ["a"]);
        assert.strictEqual(events.at(-1)?.cause, "redo");

        // A replacing import takes the old node out and puts the file's in.
        await session.data.import({ type: "csv", config: { data: "source,target\nx,y\n" } });
        const load = events.at(-1);
        assert.deepStrictEqual(load?.removed.nodes, ["a"]);
        assert.sameMembers([...(load?.added.nodes ?? [])], ["x", "y"]);
        assert.strictEqual(load?.added.edges.length, 1);
        session.dispose();
    });

    it("tells a replacing import the nodes an edge list brought in, and its undo puts them back", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\nx,y\n" } });
        const events = heard(session);

        await session.data.import({ type: "csv", config: { data: "source,target\np,q\n" } });
        assert.sameMembers([...(events.at(-1)?.removed.nodes ?? [])], ["x", "y"]);
        assert.sameMembers([...(events.at(-1)?.added.nodes ?? [])], ["p", "q"]);

        await session.undo();
        assert.sameMembers([...(events.at(-1)?.added.nodes ?? [])], ["x", "y"]);
        assert.sameMembers([...(events.at(-1)?.removed.nodes ?? [])], ["p", "q"]);
        session.dispose();
    });

    it("publishes nothing for a change that touched no node or edge", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const events = heard(session);
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });

        assert.strictEqual(events.length, 0);
        session.dispose();
    });
    it("tells a node re-imported under its id by the attribute keys whose values changed", async () => {
        const session = createGraphSession();
        const doc = (type: string): string =>
            JSON.stringify({
                nodes: [
                    { id: "a", type, size: 1 },
                    { id: "b", type: "host" },
                ],
                edges: [],
            });
        await session.data.import({ type: "json", config: { data: doc("host") } });
        const events = heard(session);

        await session.data.import({ type: "json", config: { data: doc("service") } });
        assert.sameMembers([...(events.at(-1)?.updated.nodes ?? [])], ["a", "b"]);
        assert.deepStrictEqual(events.at(-1)?.fields.nodes, ["type"]);

        await session.undo();
        assert.sameMembers([...(events.at(-1)?.updated.nodes ?? [])], ["a", "b"]);
        assert.deepStrictEqual(events.at(-1)?.fields.nodes, ["type"]);
        session.dispose();
    });

    it("tells the removal of a node whose id has no graph row as a removal", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: Number.POSITIVE_INFINITY, type: "host" }, { id: "b" }]);
        const events = heard(session);

        await session.data.removeNodes([Number.POSITIVE_INFINITY]);
        assert.deepStrictEqual(events.at(-1)?.removed.nodes, [Number.POSITIVE_INFINITY]);
        assert.deepStrictEqual(events.at(-1)?.updated, { nodes: [], edges: [] });
        assert.deepStrictEqual(events.at(-1)?.fields, { nodes: [], edges: [] });

        await session.undo();
        assert.deepStrictEqual(events.at(-1)?.added.nodes, [Number.POSITIVE_INFINITY]);
        assert.deepStrictEqual(events.at(-1)?.updated, { nodes: [], edges: [] });
        session.dispose();
    });

    it("lets go of the op logs an undo applied once its data:changed is told", async () => {
        const session = createGraphSession();
        const rows = (prefix: string): string =>
            ["source,target", ...Array.from({ length: 20_000 }, (_, at) => `${prefix}${at},${prefix}${at + 1}`)].join(
                "\n",
            );
        await session.data.import({ type: "csv", config: { data: rows("x") } });
        await session.data.import({ type: "csv", config: { data: rows("p") } });
        heard(session);
        const dispatcher = dispatcherOf(session);
        const beside = dispatcher.events.project;
        let applied: WeakRef<object> | undefined;
        dispatcher.events.project = (change) => {
            beside?.(change);
            if (change.cause === "undo" && change.graph !== undefined) {
                applied = new WeakRef(change.graph);
            }
        };

        await session.undo();
        assert.isDefined(applied);
        // A WeakRef keeps its target alive until the task that made it ends.
        await new Promise((resolve) => setImmediate(resolve));
        collect();
        assert.isUndefined(applied?.deref());
        session.dispose();
    });
});
