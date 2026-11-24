/**
 * @file Graph values in a data spec (`{ graph: ... }` entries): edges, neighbors and members walked by direction and
 * hops, a `where` leaf, count / sum / mean / min / max / mode, groups by a value, by direction and by time period,
 * windows, the undrawn code, a rename, and the walk count.
 */

import { assert, describe, it } from "vitest";

import type { GraphMeasure } from "../../../src/catalog/data-lists";
import { createGraphSession } from "../../../src/session";
import { prepareData } from "../../../src/session/styles/dataLists";
import { type DataGraph, periodKey, windowKeys } from "../../../src/session/styles/graphMeasures";

type Session = ReturnType<typeof createGraphSession>;

const NODES = [
    { id: "a", community: 1, logFC: 1, term: "x" },
    { id: "b", community: 2, logFC: 3, term: "y" },
    { id: "c", community: 2, logFC: 5, term: "y" },
    { id: "d", community: 1, logFC: 7, term: "x" },
    { id: "e" },
];
const EDGES = [
    { source: "a", target: "b", amount: 10, channel: "card", when: "2026-01-15T10:00:00Z" },
    { source: "a", target: "c", amount: 20, channel: "ach", when: "2026-03-02T00:00:00Z" },
    { source: "d", target: "a", amount: 5, channel: "card", when: "2026-03-20T00:00:00Z" },
    { source: "c", target: "d", amount: 1, channel: "card", when: "2026-02-01T00:00:00Z" },
    { source: "a", target: "a", amount: 2, channel: "self", when: "2026-03-21T00:00:00Z" },
];

/**
 * A session holding the graph, with one record layer whose entries are the Graph values given.
 * @param graphs - The Graph values.
 * @param options - Whether the graph is directed.
 * @param options.directed - Default true.
 * @returns The session and the layer id.
 */
async function withMeasures(
    graphs: readonly GraphMeasure[],
    { directed = true }: { directed?: boolean } = {},
): Promise<{ session: Session; layerId: string }> {
    const session = createGraphSession();
    await session.config.set({ data: { directed } });
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    const layer = await session.styles.add({
        name: "Graph values",
        target: "node",
        selector: { match: "everything" },
        set: { "node.recordData": { entries: graphs.map((graph) => ({ graph })) } },
    });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * Each entry's value on one node.
 * @param session - The session.
 * @param layerId - The layer.
 * @param node - The node.
 * @returns The values.
 */
function valuesOn(session: Session, layerId: string, node: string): unknown[] {
    return session.styles.dataFacts(layerId, "node.recordData", node).entries.map((entry) => entry.value);
}

describe("Graph values", () => {
    it("counts edges in, out and both on a directed graph, a self-loop once", async () => {
        const { session, layerId } = await withMeasures([
            { over: "edges", direction: "in", measure: "count" },
            { over: "edges", direction: "out", measure: "count" },
            { over: "edges", measure: "count" },
        ]);
        // a: out a>b a>c a>a, in d>a a>a; both a>b a>c d>a a>a.
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [2, 3, 4]);
        assert.deepStrictEqual(valuesOn(session, layerId, "e"), [null, null, null], "nothing walked is missing");
        assert.deepStrictEqual(session.styles.dataFacts(layerId, "node.recordData", "e").undrawn, {
            code: "data.nothingOver",
            params: { channel: "node.recordData", over: "edges" },
        });
    });

    it("reads every edge as both ways on an undirected graph", async () => {
        const { session, layerId } = await withMeasures(
            [
                { over: "edges", direction: "in", measure: "count" },
                { over: "edges", measure: "count", groupBy: { by: "direction" } },
            ],
            { directed: false },
        );
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [4, { both: 4 }]);
    });

    it("walks neighbors at 1 to 3 hops, each once, never the node itself", async () => {
        const { session, layerId } = await withMeasures([
            { over: "neighbors", measure: "count" },
            { over: "neighbors", direction: "out", measure: "count" },
            { over: "neighbors", direction: "out", hops: 2, measure: "count" },
            { over: "neighbors", direction: "out", hops: 3, measure: "count" },
        ]);
        // b's out: none. c's out: d; then a; then b.
        assert.deepStrictEqual(valuesOn(session, layerId, "c"), [2, 1, 2, 3]);
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [3, 2, 3, 3], "a reaches b, c, then d; never a");
    });

    it("sums, averages and finds the min, max and most common value", async () => {
        const { session, layerId } = await withMeasures([
            { over: "edges", direction: "out", measure: "sum", of: { path: "data.amount" } },
            { over: "neighbors", measure: "mean", of: { path: "data.logFC" } },
            { over: "neighbors", measure: "min", of: { path: "data.logFC" } },
            { over: "neighbors", measure: "max", of: { path: "data.logFC" } },
            { over: "edges", measure: "mode", of: { path: "data.channel" } },
        ]);
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [32, 5, 3, 7, "card"]);
    });

    it("keeps only what a where leaf keeps, on the edge or on the far node", async () => {
        const { session, layerId } = await withMeasures([
            {
                over: "edges",
                measure: "count",
                where: { kind: "categories", attribute: "data.channel", values: ["card"] },
            },
            {
                over: "edges",
                measure: "count",
                whereOn: "node",
                where: { kind: "range", attribute: "data.logFC", min: 4 },
            },
        ]);
        // a's edges: a>b card, a>c ach, d>a card, a>a self; far ends b 3, c 5, d 7, a 1.
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [2, 2]);
    });

    it("groups by an edge value, a far node's value and the direction", async () => {
        const { session, layerId } = await withMeasures([
            {
                over: "edges",
                direction: "out",
                measure: "sum",
                of: { path: "data.amount" },
                groupBy: { by: "value", path: "data.channel" },
            },
            { over: "neighbors", measure: "count", groupBy: { by: "value", path: "data.community" } },
            { over: "edges", measure: "count", groupBy: { by: "direction" } },
        ]);
        assert.deepStrictEqual(valuesOn(session, layerId, "a"), [
            { ach: 20, card: 10, self: 2 },
            { 1: 1, 2: 2 },
            { in: 1, out: 3 },
        ]);
    });

    it("cuts time into periods with every period present, and a window from the newest date", async () => {
        const { session, layerId } = await withMeasures([
            { over: "edges", measure: "count", groupBy: { by: "time", path: "data.when", period: "month" } },
            {
                over: "edges",
                measure: "sum",
                of: { path: "data.amount" },
                groupBy: { by: "time", path: "data.when", period: "month" },
            },
            {
                over: "edges",
                measure: "count",
                groupBy: { by: "time", path: "data.when", period: "month", window: { last: 2, from: "newest" } },
            },
        ]);
        // b's one edge is in January; the graph spans January to March.
        assert.deepStrictEqual(valuesOn(session, layerId, "b"), [
            { "2026-01": 1, "2026-02": 0, "2026-03": 0 },
            { "2026-01": 10, "2026-02": null, "2026-03": null },
            { "2026-02": 0, "2026-03": 0 },
        ]);
    });

    it("keys each period in time order", () => {
        const at = Date.UTC(2026, 0, 1, 13, 5); // a Thursday: ISO week 1 of 2026
        assert.deepStrictEqual(
            (["hour", "day", "week", "month", "quarter", "year"] as const).map((period) => periodKey(at, period)),
            ["2026-01-01T13", "2026-01-01", "2026-W01", "2026-01", "2026-Q1", "2026"],
        );
        assert.strictEqual(periodKey(Date.UTC(2027, 0, 1), "week"), "2026-W53", "Jan 1 2027 is in 2026's last week");
        assert.deepStrictEqual(windowKeys("quarter", 3, Date.UTC(2026, 1, 10)), ["2025-Q3", "2025-Q4", "2026-Q1"]);
        assert.deepStrictEqual(windowKeys("week", 2, Date.UTC(2026, 0, 5)), ["2026-W01", "2026-W02"], "from now");
    });

    it("walks the members of a group node", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "g" },
            { id: "m1", parent: "g", regulation: "up" },
            { id: "m2", parent: "g", regulation: "up" },
            { id: "m3", parent: "g", regulation: "down" },
        ]);
        const layer = await session.styles.add({
            name: "Members",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.pieData": {
                    entries: [
                        {
                            graph: {
                                over: "members",
                                measure: "count",
                                groupBy: { by: "value", path: "data.regulation" },
                            },
                        },
                    ],
                },
            },
        });
        await session.styles.settled();
        const facts = session.styles.dataFacts(layer.id, "node.pieData", "g");
        assert.deepStrictEqual(
            facts.entries[0].parts?.map((part) => [part.key, part.text]),
            [
                ["down", "1"],
                ["up", "2"],
            ],
        );
        const merged = session.styles.explain({ node: "g" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.pieSizes"], "0.333333 0.666667");
    });

    it("walks the members a collapsed group keeps", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "m1", team: "x", score: 2 },
            { id: "m2", team: "x", score: 4 },
            { id: "o", team: "y" },
        ]);
        const node = await session.groups.collapse({ groupBy: "data.team", group: "x" });
        const layer = await session.styles.add({
            name: "Mean",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.recordData": {
                    entries: [{ graph: { over: "members", measure: "mean", of: { path: "data.score" } } }],
                },
            },
        });
        await session.styles.settled();
        assert.deepStrictEqual(valuesOn(session, layer.id, String(node)), [3]);
    });

    it("follows an added edge and an edge column rename", async () => {
        const { session, layerId } = await withMeasures([
            { over: "edges", measure: "sum", of: { path: "data.amount" } },
        ]);
        assert.deepStrictEqual(valuesOn(session, layerId, "e"), [null]);
        await session.data.addEdges([{ source: "e", target: "b", amount: 7 }]);
        await session.styles.settled();
        assert.deepStrictEqual(valuesOn(session, layerId, "e"), [7]);
        assert.include(
            String((session.styles.explain({ node: "e" }).merged as Record<string, unknown>)["node.labelTable"]),
            '"text":"7"',
        );

        await session.data.renameColumn({ kind: "edge", name: "amount" }, "total");
        await session.styles.settled();
        const spec = session.styles.get(layerId)?.set?.["node.recordData"] as { entries: { graph: GraphMeasure }[] };
        assert.strictEqual(spec.entries[0].graph.of?.path, "data.total");
        assert.deepStrictEqual(valuesOn(session, layerId, "e"), [7]);
    });

    it("spreads a grouped value into one slice per group, each group one color on every node", async () => {
        const session = createGraphSession();
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        const layer = await session.styles.add({
            name: "Communities",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.pieData": {
                    entries: [
                        {
                            graph: {
                                over: "neighbors",
                                measure: "count",
                                groupBy: { by: "value", path: "data.community" },
                            },
                        },
                    ],
                },
            },
        });
        await session.styles.settled();
        const colorOf = (node: string, key: string): string | undefined =>
            session.styles.dataFacts(layer.id, "node.pieData", node).entries[0].parts?.find((part) => part.key === key)
                ?.color;
        assert.strictEqual(colorOf("a", "2"), colorOf("d", "2"));
        assert.notStrictEqual(colorOf("a", "1"), colorOf("a", "2"));
    });

    it("refuses a where that is not one range or categories leaf, and a group with no path", async () => {
        const session = createGraphSession();
        const reasonOf = async (graph: unknown): Promise<unknown> => {
            // A bad spec as an untyped caller writes it.
            const set: Record<string, unknown> = { "node.pieData": { entries: [{ graph }] } };
            try {
                await session.styles.add({ name: "Bad", target: "node", selector: { match: "everything" }, set });
            } catch (error) {
                return (error as { details?: { reason?: unknown } }).details?.reason;
            }

            return null;
        };
        assert.strictEqual(await reasonOf({ over: "edges", measure: "count", where: { kind: "isolated" } }), "where");
        assert.strictEqual(
            await reasonOf({ over: "edges", measure: "count", groupBy: { by: "value" } }),
            "entry-source",
        );
        assert.strictEqual(await reasonOf({ over: "rings", measure: "count" }), "entry-source");
    });
});

describe("Graph value cost", () => {
    it("walks each node once per preparation, whoever asks", () => {
        const count = 50;
        let visits = 0;
        const graph: DataGraph = {
            directed: false,
            edgeCount: count,
            adjacent: (node, _direction, visit) => {
                visits++;
                visit((node + 1) % count, node, "out");
            },
            members: () => [],
            held: () => [],
            edgeValue: () => 1,
        };
        const prepared = prepareData(
            "node.chartData",
            { entries: [{ graph: { over: "edges", measure: "count" } }] },
            {
                count: () => count,
                value: () => undefined,
                covers: () => true,
                columns: () => [],
                plainName: () => undefined,
                palette: () => undefined,
                graph: () => graph,
            },
        );
        for (let index = 0; index < count; index++) {
            prepared.resolve(index, () => undefined);
        }

        // The colors, the shared extent and the repaint each read every node; the walk happens once.
        assert.strictEqual(visits, count);
    });
});
