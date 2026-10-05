import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../src/errors/GraphtyError";
import { createGraphSession } from "../../src/session";

const RECIPROCAL = JSON.stringify({
    directed: true,
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
        { source: "b", target: "c" },
    ],
});

const DIRECTED_PAIR = JSON.stringify({
    directed: true,
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b" }],
});

describe("data.directed on a standalone session (#837)", () => {
    it("follows config.set on a session holding no edges", async () => {
        const s = createGraphSession();
        assert.strictEqual(s.data.snapshot().directed, true);

        await s.config.set({ data: { directed: false } });
        assert.strictEqual(s.data.snapshot().directed, false);

        await s.data.addNodes([{ id: "a" }, { id: "b" }]);
        await s.data.addEdges([{ source: "a", target: "b" }]);
        assert.strictEqual(s.data.snapshot().directed, false);
        assert.deepStrictEqual(
            s.data.neighbors("b", { direction: "out" }).records.map((item) => item.node.id),
            ["a"],
            "an undirected edge is followed from either end",
        );
        s.dispose();
    });

    it("takes the setting even when nothing reads the graph between the set and the edges", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }, { id: "b" }]);
        await s.config.set({ data: { directed: false } });
        await s.data.addEdges([{ source: "a", target: "b" }]);
        assert.strictEqual(s.data.snapshot().directed, false);
        assert.strictEqual(s.data.snapshot().nodeCount, 2);
        s.dispose();
    });

    it("accepts a partial data configuration at construction", () => {
        const s = createGraphSession({ config: { data: { directed: false } } });
        assert.strictEqual(s.config.data.directed, false);
        assert.strictEqual(s.config.data.knownFields.nodeIdPath, "id", "the rest takes its default");
        assert.strictEqual(s.data.snapshot().directed, false);
        s.dispose();
    });

    it("refuses a malformed data configuration at construction with a named error", () => {
        let caught: unknown;
        try {
            createGraphSession({ config: { data: { directed: "sideways" as unknown as boolean } } });
        } catch (error) {
            caught = error;
        }

        assert.instanceOf(caught, GraphtyError);
        assert.strictEqual(caught.code, "E_BAD_COMMAND");
    });

    it("re-freezes a graph that holds edges in the new direction, and undo puts it back", async () => {
        const s = createGraphSession();
        await s.data.import({ type: "json", config: { data: RECIPROCAL } });
        const before = s.data.snapshot();
        assert.strictEqual(before.directed, true);
        assert.deepStrictEqual(
            s.data.neighbors("c", { direction: "out" }).records.map((item) => item.node.id),
            [],
        );

        await s.config.set({ data: { directed: false } });
        const after = s.data.snapshot();
        assert.strictEqual(after.directed, false);
        assert.strictEqual(after.edgeCount, 3, "a reciprocal pair stays two edges");
        assert.deepStrictEqual(after.ids.toArray(), before.ids.toArray());
        assert.deepStrictEqual(
            s.data.neighbors("c", { direction: "out" }).records.map((item) => item.node.id),
            ["b"],
            "an undirected edge is followed from either end",
        );
        assert.deepStrictEqual(
            s.data.edges().map((edge) => [edge.source, edge.target]),
            [
                ["a", "b"],
                ["b", "a"],
                ["b", "c"],
            ],
        );

        await s.undo();
        const back = s.data.snapshot();
        assert.strictEqual(s.config.data.directed, "auto");
        assert.strictEqual(back.directed, true);
        assert.strictEqual(back.edgeCount, 3);
        const list = back.edgeList();
        assert.deepStrictEqual(
            Array.from(list.src, (src, at) => [back.ids.idOf(src), back.ids.idOf(list.dst[at])]),
            [
                ["a", "b"],
                ["b", "a"],
                ["b", "c"],
            ],
            "every edge keeps the orientation it was declared with",
        );

        await s.redo();
        assert.strictEqual(s.data.snapshot().directed, false);
        s.dispose();
    });

    it("lets a graph with edges be set to the direction it already has, or to auto", async () => {
        const s = createGraphSession();
        await s.data.import({ type: "json", config: { data: DIRECTED_PAIR } });

        await s.config.set({ data: { directed: true } });
        assert.strictEqual(s.config.data.directed, true);
        await s.config.set({ data: { directed: "auto" } });
        assert.strictEqual(s.config.data.directed, "auto");
        assert.strictEqual(s.data.snapshot().directed, true);
        s.dispose();
    });

    it("returns a graph to the direction its file declared when the setting goes back to auto", async () => {
        const s = createGraphSession();
        await s.data.import({ type: "json", config: { data: RECIPROCAL } });
        await s.config.set({ data: { directed: false } });
        await s.config.set({ data: { directed: "auto" } });
        assert.strictEqual(s.data.snapshot().directed, true);
        assert.strictEqual(s.data.statistics().directednessSource.by, "file");
        s.dispose();
    });

    it("replaces a graph with edges by a load that names the other direction", async () => {
        const s = createGraphSession();
        await s.data.import({ type: "json", config: { data: DIRECTED_PAIR } });

        await s.data.import({ type: "csv", config: { data: "source,target\nx,y\n" } }, { directed: false });
        assert.strictEqual(s.config.data.directed, false);
        assert.strictEqual(s.data.snapshot().directed, false);
        assert.strictEqual(s.data.snapshot().edgeCount, 1);

        await s.undo();
        assert.strictEqual(s.config.data.directed, "auto");
        assert.strictEqual(s.data.snapshot().directed, true);
        assert.deepStrictEqual(s.data.snapshot().ids.toArray(), ["a", "b"]);
        s.dispose();
    });

    it("undoes and redoes a direction change", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }]);
        await s.config.set({ data: { directed: false } });
        assert.strictEqual(s.data.snapshot().directed, false);

        await s.undo();
        assert.strictEqual(s.config.data.directed, "auto");
        assert.strictEqual(s.data.snapshot().directed, true);
        assert.strictEqual(s.data.snapshot().nodeCount, 1);

        await s.redo();
        assert.strictEqual(s.data.snapshot().directed, false);
        s.dispose();
    });
});
