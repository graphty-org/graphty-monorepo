import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { GraphtyError } from "../../src/errors";
import { makeSession } from "./helpers";

/*
 * `session.data.neighbors`: each distinct neighbor of a node once, with the combined weight of the
 * edges between them, paged.
 */

/**
 * A directed graph with parallel edges, a reciprocal pair and a self-loop around "j".
 * @returns the session
 */
async function directedGraph(): Promise<GraphSession> {
    const { session } = makeSession({ directed: true });
    await session.data.addNodes([{ id: "j" }, { id: "v" }, { id: "c" }, { id: "t" }, { id: "x" }]);
    await session.data.addEdges([
        { source: "j", target: "v", km: 10 },
        { source: "v", target: "j", km: 7 },
        { source: "j", target: "c", km: 2 },
        { source: "j", target: "c", km: 1 },
        { source: "t", target: "j", km: 4 },
        { source: "j", target: "j", km: 99 },
        { source: "v", target: "x", km: 50 },
    ]);
    return session;
}

const STRENGTH = { attribute: "km", meaning: "strength" } as const;
const DISTANCE = { attribute: "km", meaning: "distance" } as const;

/**
 * The error a call threw.
 * @param call - the call
 * @returns the error
 */
function thrown(call: () => unknown): GraphtyError {
    let caught: unknown;
    try {
        call();
    } catch (error) {
        caught = error;
    }

    assert.instanceOf(caught, GraphtyError);
    return caught;
}

describe("a node's neighbors with their weights", () => {
    it("sums a strength over parallel and reciprocal edges, strongest first", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j", { weight: STRENGTH });

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.name, row.weight, row.edgeCount]),
            [
                ["v", "v", 17, 2],
                ["t", "t", 4, 1],
                ["c", "c", 3, 2],
            ],
        );
        assert.strictEqual(page.total, 3, "a self-loop is not a neighbor");
        assert.deepStrictEqual(page.measuredBy, STRENGTH);
        assert.strictEqual(page.missing, 0);
        assert.strictEqual(page.offset, 0);
        assert.strictEqual(page.revision, session.data.nodePage({ limit: 0 }).revision);
        assert.isTrue(Object.isFrozen(page.records[0]));
        assert.isUndefined(page.records[0]?.excludedBy);
        session.dispose();
    });

    it("takes a distance's shortest edge and lists the nearest first", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j", { weight: DISTANCE });

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.weight]),
            [
                ["c", 1],
                ["t", 4],
                ["v", 7],
            ],
        );
        session.dispose();
    });

    it("counts edges for a null weight, and orders by name", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j", { weight: null });

        assert.isNull(page.measuredBy);
        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.weight, row.edgeCount]),
            [
                ["c", 2, 2],
                ["t", 1, 1],
                ["v", 2, 2],
            ],
        );
        session.dispose();
    });

    it("follows only arriving or only leaving edges on a directed graph", async () => {
        const session = await directedGraph();

        const out = session.data.neighbors("j", { direction: "out", weight: STRENGTH });
        assert.deepStrictEqual(
            out.records.map((row) => [row.node.id, row.weight]),
            [
                ["v", 10],
                ["c", 3],
            ],
        );

        const arriving = session.data.neighbors("j", { direction: "in", weight: STRENGTH });
        assert.deepStrictEqual(
            arriving.records.map((row) => [row.node.id, row.weight]),
            [
                ["v", 7],
                ["t", 4],
            ],
        );
        session.dispose();
    });

    it("treats every direction alike on an undirected graph", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "c", target: "a" },
            { source: "b", target: "a" },
        ]);

        assert.isFalse(session.data.snapshot().directed);
        for (const direction of ["in", "out", "all"] as const) {
            assert.deepStrictEqual(
                session.data
                    .neighbors("a", { direction, weight: null })
                    .records.map((row) => [row.node.id, row.edgeCount]),
                [
                    ["b", 2],
                    ["c", 1],
                ],
                direction,
            );
        }
        session.dispose();
    });

    it("lists exactly what the Neighborhood selection selects, minus the node", async () => {
        const directed = await directedGraph();
        const { session: undirected } = makeSession({ directed: false });
        await undirected.data.addNodes([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
        await undirected.data.addEdges([
            { source: 1, target: 2 },
            { source: 1, target: 2 },
            { source: 3, target: 1 },
            { source: 1, target: 1 },
            { source: 3, target: 4 },
        ]);

        for (const [session, id] of [
            [directed, "j"],
            [undirected, 1],
        ] as const) {
            for (const direction of ["in", "out", "all"] as const) {
                await session.selection.apply({ neighborsOf: [id], direction });
                const selected = [...session.selection.nodes].filter((node) => node !== id);
                const listed = session.data
                    .neighbors(id, { direction, weight: null, limit: Infinity })
                    .records.map((row) => row.node.id);
                assert.sameMembers(listed, selected, `${String(id)} ${direction}`);
            }
            session.dispose();
        }
    });

    it("weighs an edge with no number 1, and counts it", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b", w: "heavy" },
            { source: "a", target: "c", w: 2 },
            { source: "a", target: "c" },
        ]);

        const page = session.data.neighbors("a", { weight: { attribute: "w", meaning: "strength" } });

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.weight]),
            [
                ["c", 3],
                ["b", 1],
            ],
        );
        assert.strictEqual(page.missing, 2);
        session.dispose();
    });

    it("reads the weight the graph was loaded with when none is asked", async () => {
        const session = createGraphSession();
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                { source: "a", target: "b", weight: 0.1 },
                { source: "a", target: "c", weight: 5 },
            ],
        });
        await session.data.import({ type: "json", config: { data } });

        const page = session.data.neighbors("a");

        assert.deepStrictEqual(page.measuredBy, { attribute: "weight", meaning: "strength" });
        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.weight]),
            [
                ["c", 5],
                ["b", 0.1],
            ],
        );
        session.dispose();
    });

    it("counts edges by default when the graph has no weight", async () => {
        const session = await directedGraph();

        const page = session.data.neighbors("j");

        assert.isNull(page.measuredBy);
        assert.deepStrictEqual(
            page.records.map((row) => row.node.id),
            ["c", "t", "v"],
        );
        session.dispose();
    });

    it("sorts by the name the label path gives, falling back to the id", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        await session.data.addNodes([
            { id: "hub" },
            { id: "n1", label: "Zed" },
            { id: "n2", label: "Amy" },
            { id: "m3" },
        ]);
        await session.data.addEdges([
            { source: "hub", target: "n1" },
            { source: "hub", target: "n2" },
            { source: "hub", target: "m3" },
            { source: "hub", target: "m3" },
        ]);

        const byName = session.data.neighbors("hub", { weight: null });
        assert.deepStrictEqual(
            byName.records.map((row) => row.name),
            ["Amy", "m3", "Zed"],
        );

        const weakest = session.data.neighbors("hub", { weight: null, sort: { by: "weight" } });
        assert.deepStrictEqual(
            weakest.records.map((row) => row.node.id),
            ["n1", "n2", "m3"],
            "smallest first, equal rows in graph order",
        );

        const reversed = session.data.neighbors("hub", { weight: null, sort: { by: "name", descending: true } });
        assert.deepStrictEqual(
            reversed.records.map((row) => row.name),
            ["Zed", "m3", "Amy"],
        );
        session.dispose();
    });

    it("pages one stable order", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 30 }, (_unused, index) => ({ id: `n${String(index)}` })));
        await session.data.addEdges(
            Array.from({ length: 29 }, (_unused, index) => ({
                source: "n0",
                target: `n${String(index + 1)}`,
                w: index % 3,
            })),
        );
        const weight = { attribute: "w", meaning: "strength" } as const;

        const first = session.data.neighbors("n0", { weight, limit: 10 });
        const second = session.data.neighbors("n0", { weight, offset: 10, limit: 10 });
        const whole = session.data.neighbors("n0", { weight, limit: Infinity });

        assert.strictEqual(first.total, 29);
        assert.strictEqual(second.offset, 10);
        const counted = session.data.neighbors("n0", { weight, limit: 0 });
        assert.deepStrictEqual([counted.records.length, counted.total], [0, 29], "limit 0 counts without rows");
        assert.deepStrictEqual(
            [...first.records, ...second.records].map((row) => row.node.id),
            whole.records.slice(0, 20).map((row) => row.node.id),
        );
        assert.deepStrictEqual(
            whole.records.slice(0, 3).map((row) => row.node.id),
            ["n3", "n6", "n9"],
            "weights of 2 first, in graph order",
        );
        session.dispose();
    });

    it("lists a scope's neighbors only, and marks the ones a filter hides", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", type: "host" },
            { id: "b", type: "host" },
            { id: "c", type: "guest" },
        ]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "c" },
        ]);

        const scoped = session.data.neighbors("a", { scope: { nodes: ["c"] } });
        assert.deepStrictEqual(
            scoped.records.map((row) => row.node.id),
            ["c"],
        );

        await session.visibility.set({ kind: "categories", attribute: "data.type", values: ["host"] });
        const page = session.data.neighbors("a");
        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.excludedBy?.kind]),
            [
                ["b", undefined],
                ["c", "filter"],
            ],
        );
        assert.deepStrictEqual(
            session.data.neighbors("a", { scope: "visible" }).records.map((row) => row.node.id),
            ["b"],
            "the visible scope leaves hidden neighbors out",
        );
        session.dispose();
    });

    it('keeps ids 1 and "1" apart, and reads __proto__ as an ordinary id', async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "hub" }, { id: 1 }, { id: "1" }, { id: "__proto__" }]);
        await session.data.addEdges([
            { source: "hub", target: 1 },
            { source: "hub", target: "1" },
            { source: "hub", target: "1" },
            { source: "hub", target: "__proto__" },
        ]);

        const page = session.data.neighbors("hub", { weight: null, sort: { by: "weight", descending: true } });

        assert.deepStrictEqual(
            page.records.map((row) => [row.node.id, row.edgeCount]),
            [
                ["1", 2],
                [1, 1],
                ["__proto__", 1],
            ],
        );
        assert.isNull(page.measuredBy);
        assert.strictEqual(page.missing, 0, "counting edges, no edge lacks a weight");
        assert.isTrue(
            page.records.every((row) => row.weight === row.edgeCount),
            "a counted row's weight is its edge count",
        );
        session.dispose();
    });

    it("refuses an unknown node, an unknown weight column and a bad window", async () => {
        const session = await directedGraph();

        const unknown = thrown(() => session.data.neighbors("nobody"));
        assert.strictEqual(unknown.code, "E_UNKNOWN_ELEMENT");
        assert.deepStrictEqual(unknown.details, { kind: "node", id: "nobody" });

        const column = thrown(() => session.data.neighbors("j", { weight: { attribute: "kn", meaning: "strength" } }));
        assert.strictEqual(column.code, "E_UNKNOWN_ATTRIBUTE");
        assert.include(column.details?.candidates as string[], "km");

        assert.strictEqual(thrown(() => session.data.neighbors("j", { offset: -1 })).code, "E_OPTION_RANGE");
        assert.strictEqual(session.data.neighbors("x", { direction: "out" }).total, 0, "a known node with none");
        session.dispose();
    });
});
