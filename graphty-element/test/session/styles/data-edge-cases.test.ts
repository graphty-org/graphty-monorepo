/**
 * @file Data specs at their edges: number lists with gaps, lists of objects, category colors that hold when a plain
 * entry is added, malformed options refused, gauges past their max, ring and slice empties, grouped Graph values that
 * meet no group, relative dates on patterns, numeric text in Graph sums, Other in the facts, fixed values keyed by
 * place, chart scales beside a data spec, facts on a hidden layer, samples painted over, boxes per series, node
 * renames that leave edge paths alone, slice opacity and slice texts on a turned pie.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";

type Session = ReturnType<typeof createGraphSession>;

/**
 * A session holding these nodes and edges, with one layer over every node setting `set`.
 * @param nodes - The nodes.
 * @param set - The layer's set.
 * @param edges - The edges.
 * @returns The session and the layer id.
 */
async function withLayer(
    nodes: readonly Record<string, unknown>[],
    set: Record<string, unknown>,
    edges: readonly Record<string, unknown>[] = [],
): Promise<{ session: Session; layerId: string }> {
    const session = createGraphSession();
    await session.data.addNodes(nodes);
    if (edges.length > 0) {
        await session.data.addEdges(edges);
    }

    const layer = await session.styles.add({ name: "Data", target: "node", selector: { match: "everything" }, set });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * What one node's merged style holds for a channel.
 * @param session - The session.
 * @param node - The node.
 * @param channel - The channel.
 * @returns The value.
 */
function read(session: Session, node: string, channel: string): unknown {
    return (session.styles.explain({ node }).merged as Record<string, unknown>)[channel];
}

/**
 * The refusal a layer's set gets.
 * @param set - The set.
 * @returns Its code and reason.
 */
async function refusal(set: Record<string, unknown>): Promise<[unknown, unknown]> {
    const session = createGraphSession();
    try {
        await session.styles.add({ name: "Bad", target: "node", selector: { match: "everything" }, set });
    } catch (error) {
        const refused = error as { code?: unknown; details?: { reason?: unknown } };
        return [refused.code, refused.details?.reason];
    }

    return [null, null];
}

describe("data specs at their edges", () => {
    it("spreads a number list with a missing item by place, never as categories", async () => {
        const { session } = await withLayer([{ id: "a", v: [1, null, 3] }], {
            "node.pieData": { entries: [{ field: "data.v" }] },
        });
        assert.strictEqual(read(session, "a", "node.pieSizes"), "0.25 0.75");
    });

    it("reads a list of objects as not numbers, not one '[object Object]' category", async () => {
        const { session, layerId } = await withLayer([{ id: "a", v: [{ k: 1 }, { k: 2 }] }], {
            "node.pieData": { entries: [{ field: "data.v" }] },
        });
        const facts = session.styles.dataFacts(layerId, "node.pieData", "a");
        assert.strictEqual(facts.undrawn?.code, "data.notNumbers");
        assert.isFalse(facts.categories.some((each) => each.key.includes("object")));
    });

    it("keeps every category's color when a plain entry is added", async () => {
        const nodes = [{ id: "a", v: ["cat", "dog"], n: 2 }];
        const one = await withLayer(nodes, { "node.pieData": { entries: [{ field: "data.v" }] } });
        const two = await withLayer(nodes, {
            "node.pieData": { entries: [{ field: "data.v" }, { field: "data.n" }] },
        });
        const colors = (session: Session, layerId: string): Record<string, string> =>
            Object.fromEntries(
                session.styles.dataFacts(layerId, "node.pieData", "a").categories.map((each) => [each.key, each.color]),
            );
        const before = colors(one.session, one.layerId);
        const after = colors(two.session, two.layerId);
        assert.strictEqual(after.cat, before.cat);
        assert.strictEqual(after.dog, before.dog);
    });

    it("refuses malformed options with E_BAD_COMMAND and reason option, never an internal error", async () => {
        const pie = (extra: Record<string, unknown>, entry: Record<string, unknown> = {}): Record<string, unknown> => ({
            "node.pieData": { entries: [{ field: "data.v", ...entry }], ...extra },
        });
        for (const set of [
            pie({ categories: { dog: null } }),
            pie({ whole: { max: "x" } }),
            pie({ whole: { max: -5 } }),
            pie({ labels: "nope" }),
            pie({ order: "zzz" }),
            pie({ empty: "maybe" }),
            pie({}, { each: "bogus" }),
            pie({}, { missing: 7 }),
            pie({}, { label: 5 }),
            pie({}, { opacity: 2 }),
            { "node.chartData": { entries: [{ field: "data.v" }], scale: { min: "0" } } },
            { "node.recordData": { entries: [{ field: "data.v" }], layout: "grid" } },
        ]) {
            assert.deepStrictEqual(await refusal(set), ["E_BAD_COMMAND", "option"], JSON.stringify(set));
        }
    });

    it("fills a gauge past its max, never past the turn", async () => {
        const { session } = await withLayer([{ id: "a", x: 8, y: 6 }], {
            "node.pieData": { entries: [{ field: "data.x" }, { field: "data.y" }], whole: { max: 10 } },
        });
        const sizes = String(read(session, "a", "node.pieSizes"))
            .split(" ")
            .map(Number);
        assert.isAtMost(
            sizes.reduce((a, b) => a + b, 0),
            1.000001,
        );
    });

    it("draws a ring with a hole and a slice as a full disc, and nothing for a gray-only node by default", async () => {
        const nodes = [{ id: "a", x: 1 }, { id: "b" }];
        const ring = await withLayer(nodes, { "node.pieData": { entries: [{ field: "data.x" }], empty: "ring" } });
        const slice = await withLayer(nodes, { "node.pieData": { entries: [{ field: "data.x" }], empty: "slice" } });
        assert.strictEqual(read(ring.session, "b", "node.pieHole"), 0.8);
        assert.notStrictEqual(read(slice.session, "b", "node.pieHole"), 0.8);
        assert.strictEqual(read(slice.session, "b", "node.pieColors"), "#BDBDBD");

        const gray = await withLayer(nodes, {
            "node.pieData": { entries: [{ field: "data.x", missing: "gray" }] },
        });
        assert.strictEqual(read(gray.session, "b", "node.pieColors"), undefined);
        assert.strictEqual(
            gray.session.styles.dataFacts(gray.layerId, "node.pieData", "b").undrawn?.code,
            "data.noValues",
        );
    });

    it("says a grouped Graph value that met no group has no values, not that they are not numbers", async () => {
        const { session, layerId } = await withLayer(
            [{ id: "a", community: 1 }, { id: "b" }, { id: "c" }],
            {
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
            [{ source: "b", target: "c" }],
        );
        assert.strictEqual(session.styles.dataFacts(layerId, "node.pieData", "b").undrawn?.code, "data.noValues");
    });

    it("measures a pattern's relative dates against the newest date in the data", async () => {
        const { session, layerId } = await withLayer([{ id: "a", d1: "2020-01-01", d2: "2020-01-02" }], {
            "node.recordData": { entries: [{ pattern: "d", format: { date: { style: "relative" } } }] },
        });
        const text = session.styles.dataFacts(layerId, "node.recordData", "a").entries[0].text ?? "";
        assert.notInclude(text, "year");
    });

    it("sums an edge value held as text, as a field entry reads it", async () => {
        const { session, layerId } = await withLayer(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            {
                "node.recordData": {
                    entries: [{ graph: { over: "edges", measure: "sum", of: { path: "data.amount" } } }],
                },
            },
            [
                { source: "a", target: "b", amount: "5" },
                { source: "a", target: "c", amount: "7" },
            ],
        );
        assert.strictEqual(session.styles.dataFacts(layerId, "node.recordData", "a").entries[0].value, 12);
    });

    it("lists Other in the facts when it merges plain entries", async () => {
        const { session, layerId } = await withLayer([{ id: "a", x: 1, y: 2, z: 3 }], {
            "node.pieData": { entries: [{ field: "data.x" }, { field: "data.y" }, { field: "data.z" }], keep: 2 },
        });
        const parts = session.styles
            .dataFacts(layerId, "node.pieData", "a")
            .entries.flatMap((entry) => entry.parts ?? []);
        assert.deepStrictEqual(
            parts.filter((part) => part.role === "other").map((part) => part.text),
            ["1"],
        );
    });

    it("keys fixed values by place: two of one label keep two colors, and the name is the value", async () => {
        const { session, layerId } = await withLayer([{ id: "a" }], {
            "node.pieData": { entries: [{ value: 1, label: "x" }, { value: 3, label: "x" }, { value: 7 }] },
        });
        const colors = String(read(session, "a", "node.pieColors")).split(" ");
        assert.notStrictEqual(colors[0], colors[1]);
        const names = session.styles.dataFacts(layerId, "node.pieData", "a").categories.map((each) => each.name);
        assert.deepStrictEqual(names.slice(0, 3), ["x", "x", "7"]);
    });

    it("refuses a fixed chart range on the layer that holds a chart spec", async () => {
        assert.deepStrictEqual(
            await refusal({ "node.chartData": { entries: [{ field: "data.v" }] }, "node.chartMin": -100 }),
            ["E_BAD_COMMAND", "data-and-fixed"],
        );
    });

    it("aligns a number held as text right in a record table", async () => {
        const { session } = await withLayer([{ id: "a", n: "5" }], {
            "node.recordData": { entries: [{ field: "data.n" }] },
        });
        const table = JSON.parse(String(read(session, "a", "node.labelTable"))) as {
            rows: { cells: { align?: string }[] }[];
        };
        assert.strictEqual(table.rows[0].cells[1].align, "right");
    });

    it("answers facts and samples on a hidden layer without throwing", async () => {
        const { session, layerId } = await withLayer([{ id: "a", x: 1 }], {
            "node.pieData": { entries: [{ field: "data.x" }] },
        });
        await session.styles.update(layerId, { enabled: false });
        await session.styles.settled();
        assert.strictEqual(session.styles.dataFacts(layerId, "node.pieData", "a").undrawn?.code, "data.notPainted");
        assert.isNull(session.styles.dataSample(layerId, "node.pieData", "first"));
    });

    it("finds a node a layer above paints over as one that draws nothing", async () => {
        const { session, layerId } = await withLayer(
            [
                { id: "a", x: 1 },
                { id: "b", x: 2 },
            ],
            {
                "node.pieData": { entries: [{ field: "data.x" }] },
            },
        );
        await session.styles.add({
            name: "Over",
            target: "node",
            selector: { match: "ids", nodes: ["a"] as NodeId[] },
            set: { "node.pieColors": "#ff0000" },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "undrawn"), "a");
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "first"), "b");
    });

    it("draws one box per series, never counting a missing value", async () => {
        const gray = await withLayer([{ id: "a", e1: 1, e2: 9 }], {
            "node.chartData": {
                entries: [{ field: "data.e1" }, { field: "data.e2" }, { field: "data.e3", missing: "gray" }],
            },
            "node.chartKind": "box",
        });
        assert.strictEqual(read(gray.session, "a", "node.chartValues"), "1 3 5 7 9");

        const series = await withLayer(
            [
                {
                    id: "a",
                    ...Object.fromEntries([
                        ["x_a_1", 1],
                        ["x_a_2", 3],
                        ["x_b_1", 10],
                        ["x_b_2", 20],
                    ]),
                },
            ],
            {
                "node.chartData": { entries: [{ pattern: "x_" }], series: { separator: "_" } },
                "node.chartKind": "box",
            },
        );
        assert.strictEqual(read(series.session, "a", "node.chartValues"), "1 1.5 2 2.5 3 10 12.5 15 17.5 20");
    });

    it("renames a node column without touching an edge column of the same name in a Graph value", async () => {
        const graph = { over: "edges", measure: "sum", of: { path: "data.amount" } };
        const { session, layerId } = await withLayer(
            [{ id: "a", amount: 1 }, { id: "b" }],
            { "node.recordData": { entries: [{ field: "data.amount" }, { graph }] } },
            [{ source: "a", target: "b", amount: 4 }],
        );
        await session.data.renameColumn({ kind: "node", name: "amount" }, "total");
        const set = session.styles.list().find((each) => each.id === layerId)?.set as Record<
            string,
            { entries: unknown[] }
        >;
        assert.deepStrictEqual(set["node.recordData"].entries, [{ field: "data.total" }, { graph }]);
    });

    it("gives a slice the opacity its category or entry sets", async () => {
        const { session } = await withLayer([{ id: "a", v: ["cat", "dog"] }], {
            "node.pieData": { entries: [{ field: "data.v" }], categories: { dog: { opacity: 0.5 } } },
        });
        assert.strictEqual(read(session, "a", "node.pieOpacities"), "1 0.5");
    });

    it("turns slice texts with the pie's rotation", async () => {
        const nodes = [{ id: "a", x: 1, y: 3 }];
        const spec = { entries: [{ field: "data.x" }, { field: "data.y" }], labels: "percent" };
        const plain = await withLayer(nodes, { "node.pieData": spec });
        const turned = await withLayer(nodes, { "node.pieData": spec, "node.pieRotation": 90 });
        const first = (session: Session): unknown =>
            (JSON.parse(String(read(session, "a", "node.shapeTexts"))) as unknown[][])[0].slice(0, 2);
        assert.notDeepEqual(first(plain.session), first(turned.session));
    });
});
