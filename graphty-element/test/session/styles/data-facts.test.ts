/**
 * @file What an editor reads about a data spec: each entry's text and parts on a node (`styles.dataFacts`), why a
 * node draws nothing, the sample a panel shows (`styles.dataSample`), the categories in color order, every
 * refusal's `details.reason`, a column rename following the spec, a palette carried in the save, and `dataFit`.
 */

import { assert, describe, it } from "vitest";

import { dataFit } from "../../../src/catalog/data-lists";
import type { ReadableValue } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";
import { carriedFor } from "../../../src/session/styles/carried";
import { createScaleRegistry } from "../../../src/session/styles/scales";

const NODES = [
    { id: "a", animals: ["dog", "dog", "cat"], amount: 1234.5, word: "x" },
    { id: "b", animals: ["horse"] },
    { id: "c", word: "y" },
];

/**
 * A session holding the nodes and one layer setting `set`.
 * @param set - The layer's set.
 * @returns The session and the layer id.
 */
async function withLayer(
    set: Record<string, unknown>,
): Promise<{ session: ReturnType<typeof createGraphSession>; layerId: string }> {
    const session = createGraphSession();
    await session.data.addNodes(NODES);
    const layer = await session.styles.add({ name: "Data", target: "node", selector: { match: "everything" }, set });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * The refusal a spec gets.
 * @param set - The layer's set.
 * @returns Its code and `details.reason`.
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

describe("data facts", () => {
    it("gives each entry's value, its text in the entry's format, and a spread's parts with colors", async () => {
        const { session, layerId } = await withLayer({
            "node.pieData": {
                entries: [
                    { field: "data.animals" },
                    { field: "data.amount", format: { maximumFractionDigits: 0, prefix: "$" } },
                ],
            },
        });
        const facts = session.styles.dataFacts(layerId, "node.pieData", "a");
        assert.strictEqual(facts.node, "a");
        assert.strictEqual(facts.undrawn, null);
        assert.deepStrictEqual(
            facts.entries[0].parts?.map((part) => [part.key, part.text]),
            [
                ["cat", "1"],
                ["dog", "2"],
            ],
        );
        assert.deepStrictEqual(
            facts.entries[0].parts?.map((part) => part.value),
            [1, 2],
            "each part's number before formatting",
        );
        assert.strictEqual(facts.entries[1].text, "$1,235");
        assert.deepStrictEqual(
            facts.categories.map((each) => each.key),
            ["cat", "dog", "horse", "data.amount"],
            "the spread categories in natural name order, then each plain entry's key in entry order",
        );
        assert.strictEqual(facts.entries[0].parts?.[0].color, facts.categories[0].color);
    });

    it("marks a pattern's parts as columns, so a category spelled with a dot is not read as one", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        await session.data.addNodes([{ id: "a", label: "Farm A", city: ["St. Louis", "St. Louis"], x_1: 4, x_2: 7 }]);
        const layer = await session.styles.add({
            name: "Data",
            target: "node",
            selector: { match: "everything" },
            set: { "node.chartData": { entries: [{ pattern: "x_" }, { field: "data.city" }] } },
        });
        const label = await session.styles.add({
            name: "Label",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "{data.label}" },
        });
        await session.styles.settled();
        const facts = session.styles.dataFacts(layer.id, "node.chartData", "a");
        assert.deepStrictEqual(
            facts.entries[0].parts?.map((part) => part.column),
            [true, true],
        );
        assert.deepStrictEqual(
            facts.entries[1].parts?.map((part) => [part.key, part.column]),
            [["St. Louis", undefined]],
        );
        assert.strictEqual(facts.name, "Farm A", "named by its label in the data, not its id or the template");
        assert.isString(label.id);
    });

    it("says why a node draws nothing, as a code with params", async () => {
        const pie = await withLayer({ "node.pieData": { entries: [{ field: "data.animals" }] } });
        assert.deepStrictEqual(pie.session.styles.dataFacts(pie.layerId, "node.pieData", "c").undrawn, {
            code: "data.noValues",
            params: { channel: "node.pieData", paths: ["data.animals"] },
        });

        const words = await withLayer({ "node.pieData": { entries: [{ field: "data.word" }] } });
        assert.deepStrictEqual(words.session.styles.dataFacts(words.layerId, "node.pieData", "c").undrawn, {
            code: "data.notNumbers",
            params: { channel: "node.pieData", path: "data.word", valueKind: "text" },
        });

        const none = await withLayer({ "node.chartData": { entries: [] } });
        assert.strictEqual(
            none.session.styles.dataFacts(none.layerId, "node.chartData", "a").undrawn?.code,
            "data.noEntries",
        );

        const zero = await withLayer({ "node.pieData": { entries: [{ value: 0 }] } });
        assert.strictEqual(
            zero.session.styles.dataFacts(zero.layerId, "node.pieData", "a").undrawn?.code,
            "data.zeroTotal",
        );

        const pattern = await withLayer({ "node.chartData": { entries: [{ pattern: "nothing_" }] } });
        assert.deepStrictEqual(pattern.session.styles.dataFacts(pattern.layerId, "node.chartData", "a").undrawn, {
            code: "data.patternEmpty",
            params: { channel: "node.chartData", pattern: "nothing_", except: false },
        });

        const over = await withLayer({ "node.pieData": { entries: [{ field: "data.animals" }] } });
        const above = await over.session.styles.add({
            name: "Above",
            target: "node",
            selector: { match: "everything" },
            set: { "node.pieColors": "red" },
        });
        await over.session.styles.settled();
        assert.deepStrictEqual(over.session.styles.dataFacts(over.layerId, "node.pieData", "a").undrawn, {
            code: "data.paintedOver",
            params: { channel: "node.pieData", layerId: above.id, filled: "node.pieColors" },
        });
    });

    it("finds a sample: the first that draws, the next, one that draws nothing, one with a missing value", async () => {
        const { session, layerId } = await withLayer({ "node.pieData": { entries: [{ field: "data.animals" }] } });
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "first"), "a");
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "next", "a"), "b");
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "next", "b"), null);
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "undrawn"), "c");
        assert.strictEqual(session.styles.dataSample(layerId, "node.pieData", "missing"), "c");
    });

    it("lists pinned and unseen categories, Other and missing", async () => {
        const { session, layerId } = await withLayer({
            "node.pieData": {
                entries: [{ field: "data.animals" }],
                keep: 1,
                empty: "ring",
                categories: { dog: { color: "#ff0000" }, zebra: { label: "Zebra" } },
            },
        });
        const { categories } = session.styles.dataFacts(layerId, "node.pieData", "a");
        assert.deepStrictEqual(
            categories.map((each) => [each.key, each.pinned, each.unseen ?? false, each.role ?? null]),
            [
                ["cat", false, false, null],
                ["dog", true, false, null],
                ["horse", false, false, null],
                ["zebra", false, true, null],
                ["", false, false, "other"],
                ["", false, false, "missing"],
            ],
        );
        assert.strictEqual(categories[1].color, "#ff0000");
    });

    it("refuses each malformed spec with E_BAD_COMMAND and a reason", async () => {
        const cases: [Record<string, unknown>, string][] = [
            [{ "node.pieData": { entries: [{ field: "data.a", value: 1 }] } }, "entry-source"],
            [{ "node.pieData": { entries: [{}] } }, "entry-source"],
            [{ "node.pieData": { entries: [{ text: "a" }] } }, "entry-kind"],
            [{ "node.recordData": { entries: [{ value: 1 }] } }, "entry-kind"],
            [{ "node.pieData": { entries: [{ graph: { over: "edges", measure: "sum" } }] } }, "measure-of"],
            [{ "node.pieData": { entries: [{ graph: { over: "neighbors", measure: "count", hops: 4 } }] } }, "hops"],
            [{ "node.pieData": { entries: [], keep: 0 } }, "keep"],
            [{ "node.recordData": { entries: [], most: 1.5 } }, "most"],
            [{ "node.chartData": { entries: [], scale: { clip: [50, 10] } } }, "clip"],
            [
                {
                    "node.chartData": {
                        entries: [
                            {
                                graph: {
                                    over: "edges",
                                    measure: "count",
                                    groupBy: {
                                        by: "time",
                                        path: "data.t",
                                        period: "month",
                                        window: { last: 0, from: "now" },
                                    },
                                },
                            },
                        ],
                    },
                },
                "window",
            ],
            [{ "node.pieData": { entries: [], palette: "no-such-palette" } }, "palette"],
            [{ "node.pieData": { entries: [], colors: ["not a color"] } }, "colors"],
            [{ "node.pieData": { entries: [] }, "node.pieSizes": "1" }, "data-and-fixed"],
        ];
        for (const [set, reason] of cases) {
            assert.deepStrictEqual(await refusal(set), ["E_BAD_COMMAND", reason], JSON.stringify(set));
        }
    });

    it("lists every path a spec reads in the layer's reads", async () => {
        const { session, layerId } = await withLayer({
            "node.recordData": { entries: [{ field: "data.amount" }, { text: "t" }], header: "data.word" },
        });
        assert.deepStrictEqual([...session.styles.counts(layerId).reads].sort(), ["data.amount", "data.word"]);
    });

    it("follows a column rename: fields, header and category keys", async () => {
        const { session, layerId } = await withLayer({
            "node.recordData": { entries: [{ field: "data.amount" }], header: "data.amount" },
            "node.pieData": {
                entries: [{ field: "data.amount" }],
                categories: { "data.amount": { color: "#ff0000" } },
            },
        });
        await session.data.renameColumn({ kind: "node", name: "amount" }, "total");
        const set = session.styles.list().find((each) => each.id === layerId)?.set as Record<
            string,
            Record<string, unknown>
        >;
        assert.deepStrictEqual(set["node.recordData"], { entries: [{ field: "data.total" }], header: "data.total" });
        assert.deepStrictEqual(set["node.pieData"].categories, { "data.total": { color: "#ff0000" } });
    });

    it("carries the palette a spec names in the saved style document", () => {
        const carried = carriedFor(
            [
                {
                    name: "P",
                    selector: { match: "everything" },
                    set: { "node.pieData": { entries: [], palette: "tol-muted" } },
                },
            ],
            createScaleRegistry().carried,
        );
        assert.deepStrictEqual(
            carried.palettes.map((each) => each.id),
            ["tol-muted"],
        );
    });

    it("says which values fit a pie or chart, and a record takes every node value", () => {
        const value = (overrides: Partial<ReadableValue>): ReadableValue =>
            ({
                path: "data.x",
                plainName: "x",
                technicalName: "x",
                on: "node",
                from: "data",
                kind: "number",
                ...overrides,
            }) as ReadableValue;
        assert.strictEqual(dataFit("node.pieData", value({})), null);
        assert.deepStrictEqual(dataFit("node.chartData", value({ kind: "text" })), {
            code: "data.needsNumbers",
            params: { path: "data.x", valueKind: "text" },
        });
        assert.strictEqual(dataFit("node.pieData", value({ kind: "category", spread: "categories" })), null);
        assert.strictEqual(dataFit("node.recordData", value({ kind: "text" })), null);
        assert.deepStrictEqual(dataFit("node.recordData", value({ on: "edge" })), {
            code: "data.wrongHalf",
            params: { path: "data.x", on: "edge" },
        });
    });
});
