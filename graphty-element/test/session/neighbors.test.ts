import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { makeSession } from "./helpers";

/*
 * `session.data.neighbors`: one row per neighbor of a node, with the edges between them summed
 * into one tie -- what an inspector reads to list "Valjean, 17 shared chapters".
 */
describe("a node's neighbors with tie strength", () => {
    /**
     * A directed graph with parallel edges and a self-loop around "j".
     * @returns the session
     */
    async function directedGraph(): Promise<ReturnType<typeof createGraphSession>> {
        const { session } = makeSession({ directed: true });
        await session.data.addNodes([{ id: "j" }, { id: "v" }, { id: "c" }, { id: "t" }, { id: "x" }]);
        await session.data.addEdges([
            { source: "j", target: "v", chapters: 10 },
            { source: "v", target: "j", chapters: 7 },
            { source: "j", target: "c", chapters: 2 },
            { source: "j", target: "c", chapters: 1 },
            { source: "t", target: "j", chapters: 4 },
            { source: "j", target: "j", chapters: 99 },
            { source: "v", target: "x", chapters: 50 },
        ]);
        return session;
    }

    it("sums parallel edges into one tie, strongest first, and names the edges", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j", { weight: "chapters" });

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.tie, row.edges.length]),
            [
                ["v", 17, 2],
                ["t", 4, 1],
                ["c", 3, 2],
            ],
        );
        assert.strictEqual(page.total, 3, "a self-loop is not a neighbor");
        assert.strictEqual(page.offset, 0);
        assert.isString(page.revision);
        for (const id of page.records[0]?.edges ?? []) {
            const edge = session.data.edge(id);
            assert.sameMembers([edge?.source, edge?.target], ["j", "v"]);
        }
        assert.isTrue(Object.isFrozen(page.records[0]));
        session.dispose();
    });

    it("counts the edges when no weight is named", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j");

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.tie]),
            [
                ["v", 2],
                ["c", 2],
                ["t", 1],
            ],
            "equal ties keep the graph's order",
        );
        session.dispose();
    });

    it("follows only arriving or only leaving edges on a directed graph", async () => {
        const session = await directedGraph();

        const out = session.data.neighbors("j", { direction: "out", weight: "chapters" });
        assert.deepStrictEqual(
            out.records.map((row) => [row.node.id, row.tie]),
            [
                ["v", 10],
                ["c", 3],
            ],
        );

        const arriving = session.data.neighbors("j", { direction: "in", weight: "chapters" });
        assert.deepStrictEqual(
            arriving.records.map((row) => [row.node.id, row.tie]),
            [
                ["v", 7],
                ["t", 4],
            ],
        );
        session.dispose();
    });

    it("ignores direction on an undirected graph", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "c", target: "a" },
        ]);

        assert.isFalse(session.data.snapshot().directed);
        for (const direction of ["in", "out", "all"] as const) {
            assert.deepStrictEqual(
                session.data.neighbors("a", { direction }).records.map((row) => row.node.id),
                ["b", "c"],
                direction,
            );
        }
        session.dispose();
    });

    it("pages a stable order with the total, and sorts in graph order on request", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 30 }, (_unused, index) => ({ id: `n${String(index)}` })));
        await session.data.addEdges(
            Array.from({ length: 29 }, (_unused, index) => ({
                source: "n0",
                target: `n${String(index + 1)}`,
                w: index % 3,
            })),
        );

        const first = session.data.neighbors("n0", { weight: "w", limit: 10 });
        const second = session.data.neighbors("n0", { weight: "w", offset: 10, limit: 10 });
        const whole = session.data.neighbors("n0", { weight: "w", limit: Infinity });

        assert.strictEqual(first.total, 29);
        assert.strictEqual(second.offset, 10);
        assert.deepStrictEqual(
            [...first.records, ...second.records].map((row) => row.node.id),
            whole.records.slice(0, 20).map((row) => row.node.id),
        );
        assert.deepStrictEqual(
            whole.records.slice(0, 3).map((row) => row.node.id),
            ["n3", "n6", "n9"],
            "ties of 2 first, in graph order",
        );
        assert.deepStrictEqual(
            session.data.neighbors("n0", { sort: "graph", limit: 3 }).records.map((row) => row.node.id),
            ["n1", "n2", "n3"],
        );
        session.dispose();
    });

    it("answers an empty page for a node the graph does not hold, and refuses a bad window", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);

        assert.strictEqual(session.data.neighbors("nobody").total, 0);
        assert.strictEqual(session.data.neighbors("a").total, 0);
        assert.throws(() => session.data.neighbors("a", { offset: -1 }), /whole number/);
        session.dispose();
    });

    it("counts a weight that is not a number as nothing", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b", w: "heavy" },
            { source: "a", target: "c", w: 2 },
        ]);

        assert.deepStrictEqual(
            session.data.neighbors("a", { weight: "w" }).records.map((row) => [row.node.id, row.tie]),
            [
                ["c", 2],
                ["b", 0],
            ],
        );
        session.dispose();
    });
});
