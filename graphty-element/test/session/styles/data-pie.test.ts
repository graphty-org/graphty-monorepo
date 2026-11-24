/**
 * @file A pie from data (`node.pieData`): a list field counted per value, equal shares, number lists, several
 * entries mixed with a spread, order, top N and Other, a gauge, slice texts, empty nodes, missing values, one color
 * per category on every node, overrides, the refusal beside fixed lists, and the stack above it.
 */

import { assert, describe, it } from "vitest";

import type { PieData } from "../../../src/catalog/data-lists";
import { createGraphSession } from "../../../src/session";

type Session = ReturnType<typeof createGraphSession>;

/**
 * A session holding these nodes, with one pie layer over every node.
 * @param nodes - The nodes.
 * @param pie - The pie spec.
 * @returns The session and the layer id.
 */
async function pieOf(
    nodes: readonly Record<string, unknown>[],
    pie: PieData,
): Promise<{ session: Session; layerId: string }> {
    const session = createGraphSession();
    await session.data.addNodes(nodes);
    const layer = await session.styles.add({
        name: "Pie",
        target: "node",
        selector: { match: "everything" },
        set: { "node.pieData": pie },
    });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * The pie one node draws.
 * @param session - The session.
 * @param node - The node.
 * @returns Its colors, sizes and texts.
 */
function drawn(session: Session, node: string): { colors: string[]; sizes: number[]; texts: unknown } {
    const merged = session.styles.explain({ node }).merged as Record<string, unknown>;
    const words = (key: string): string[] =>
        typeof merged[key] === "string" ? merged[key].split(" ").filter((w) => w !== "") : [];
    return {
        colors: words("node.pieColors"),
        sizes: words("node.pieSizes").map(Number),
        texts: typeof merged["node.shapeTexts"] === "string" ? JSON.parse(merged["node.shapeTexts"]) : undefined,
    };
}

const ANIMALS = [
    { id: "a", animals: ["dog", "dog", "cat", "horse"] },
    { id: "b", animals: ["cat", "horse", "horse"] },
    { id: "c" },
];

describe("a pie from data", () => {
    it("counts each value of a list field: dog 2, cat 1, horse 1", async () => {
        const { session } = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }] });
        const a = drawn(session, "a");
        assert.deepStrictEqual(a.sizes, [0.25, 0.5, 0.25], "cat, dog, horse in natural name order");
        assert.strictEqual(a.colors.length, 3);
        assert.deepStrictEqual(drawn(session, "c").colors, [], "a node with no list draws nothing");
    });

    it("gives a category the same color on every node, whatever its place", async () => {
        const { session } = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }], order: "largest" });
        const a = drawn(session, "a");
        const b = drawn(session, "b");
        // a: dog 2 first; b: horse 2 first. cat is second on a and on b.
        const colorOf = (pie: typeof a, at: number): string => pie.colors[at];
        assert.strictEqual(colorOf(a, 0) === colorOf(b, 0), false, "dog and horse differ");
        assert.strictEqual(colorOf(a, 2), colorOf(b, 0), "horse is one color on both nodes");
    });

    it("gives equal shares with each: equal, and spreads number lists by item or by a statistic", async () => {
        const equal = await pieOf(ANIMALS, { entries: [{ field: "data.animals", each: "equal" }] });
        assert.deepStrictEqual(
            drawn(equal.session, "a").sizes.map((s) => Math.round(s * 1000) / 1000),
            [0.333, 0.333, 0.333],
        );

        const items = await pieOf([{ id: "n", scores: [1, 3] }], { entries: [{ field: "data.scores" }] });
        assert.deepStrictEqual(drawn(items.session, "n").sizes, [0.25, 0.75]);

        const sum = await pieOf([{ id: "n", scores: [1, 3], other: 4 }], {
            entries: [{ field: "data.scores", each: "sum" }, { field: "data.other" }],
        });
        assert.deepStrictEqual(drawn(sum.session, "n").sizes, [0.5, 0.5]);
    });

    it("mixes fixed-key entries with a spread, ordered and kept as one list", async () => {
        const { session } = await pieOf([{ id: "n", animals: ["dog", "cat"], card: 2, ach: 6 }], {
            entries: [{ field: "data.card" }, { field: "data.ach" }, { field: "data.animals" }],
            order: "largest",
        });
        assert.deepStrictEqual(drawn(session, "n").sizes, [0.6, 0.2, 0.1, 0.1]);
    });

    it("orders by name, keeps the largest and merges the rest into Other, drawn last in its gray", async () => {
        const named = await pieOf([{ id: "n", x: 1, a: 3, m: 2 }], {
            entries: [{ field: "data.x" }, { field: "data.a" }, { field: "data.m" }],
            order: "name",
        });
        assert.deepStrictEqual(drawn(named.session, "n").sizes, [0.5, 0.333333, 0.166667]);

        const kept = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }], order: "largest", keep: 2 });
        const a = drawn(kept.session, "a");
        assert.deepStrictEqual(a.sizes, [0.5, 0.25, 0.25]);
        assert.strictEqual(a.colors[2], "#686868", "Other is the element's Other gray");

        const own = await pieOf(ANIMALS, {
            entries: [{ field: "data.animals" }],
            keep: 1,
            other: { color: "#123456" },
        });
        assert.strictEqual(drawn(own.session, "a").colors.at(-1), "#123456");
    });

    it("draws a gauge over a max, the rest in the track or not drawn", async () => {
        const track = await pieOf([{ id: "n", v: 25 }], {
            entries: [{ field: "data.v", color: "#ff0000" }],
            whole: { max: 100, track: "#eeeeee" },
        });
        assert.deepStrictEqual(drawn(track.session, "n"), {
            colors: ["#ff0000", "#eeeeee"],
            sizes: [0.25, 0.75],
            texts: undefined,
        });

        const bare = await pieOf([{ id: "n", v: 25 }], { entries: [{ field: "data.v" }], whole: { max: 100 } });
        const merged = bare.session.styles.explain({ node: "n" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.pieOpacities"], "1 0", "the rest of the turn is not drawn");
    });

    it("writes each slice's value or percent at its middle, after the texts beneath", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "n", a: 1, b: 3 }]);
        await session.styles.add({
            name: "Texts",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shapeTexts": '[[0, 0, "own"]]' },
        });
        await session.styles.add({
            name: "Pie",
            target: "node",
            selector: { match: "everything" },
            set: { "node.pieData": { entries: [{ field: "data.a" }, { field: "data.b" }], labels: "percent" } },
        });
        await session.styles.settled();
        const texts = drawn(session, "n").texts as [number, number, string][];
        assert.deepStrictEqual(
            texts.map((each) => each[2]),
            ["own", "25%", "75%"],
        );
        assert.ok(texts[1][0] > 0 && texts[2][0] < 0, "the first slice is right of twelve o'clock, the second left");
    });

    it("draws an empty node as nothing, a gray ring or a missing slice, and a missing value as skip or gray", async () => {
        const ring = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }], empty: "ring" });
        assert.deepStrictEqual(drawn(ring.session, "c").colors, ["#BDBDBD"]);

        const gray = await pieOf([{ id: "n", a: 1 }], {
            entries: [{ field: "data.a" }, { field: "data.b", missing: "gray" }],
        });
        assert.deepStrictEqual(drawn(gray.session, "n").sizes, [0.99, 0.01], "the gray slice is 1%, out of the total");
        assert.strictEqual(drawn(gray.session, "n").colors[1], "#BDBDBD");

        const skip = await pieOf([{ id: "n", a: 1 }], { entries: [{ field: "data.a" }, { field: "data.b" }] });
        assert.deepStrictEqual(drawn(skip.session, "n").sizes, [1]);
    });

    it("keeps a color after a filter hides the nodes holding the first category", async () => {
        const { session } = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }] });
        const before = drawn(session, "b").colors;
        await session.visibility.set({ kind: "categories", attribute: "data.id", values: ["b", "c"] });
        await session.styles.settled();
        assert.deepStrictEqual(drawn(session, "b").colors, before);
    });

    it("recolors and renames a category by its key without moving the others", async () => {
        const { session, layerId } = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }] });
        const before = drawn(session, "a").colors;
        await session.styles.update(layerId, {
            set: {
                "node.pieData": {
                    entries: [{ field: "data.animals" }],
                    categories: { cat: { color: "#ff0000", label: "Cats" } },
                },
            },
        });
        await session.styles.settled();
        const after = drawn(session, "a").colors;
        assert.deepStrictEqual(after, ["#ff0000", before[1], before[2]]);
        const facts = session.styles.dataFacts(layerId, "node.pieData", "a");
        assert.strictEqual(facts.categories.find((each) => each.key === "cat")?.name, "Cats");
    });

    it("refuses data beside the fixed lists on one layer", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        let refused: { code?: string; details?: Record<string, unknown> } | undefined;
        try {
            await session.styles.add({
                name: "Both",
                target: "node",
                selector: { match: "everything" },
                set: { "node.pieData": { entries: [{ field: "data.v" }] }, "node.pieColors": "red" },
            });
        } catch (error) {
            refused = error as typeof refused;
        }
        assert.strictEqual(refused?.code, "E_BAD_COMMAND");
        assert.strictEqual(refused?.details?.reason, "data-and-fixed");
        assert.deepStrictEqual(refused?.details?.channels, ["node.pieData", "node.pieColors"]);
    });

    it("stands where its lists would: a layer above wins a list, an item address changes one slice", async () => {
        const { session } = await pieOf([{ id: "n", a: 1, b: 3 }], {
            entries: [
                { field: "data.a", color: "#111111" },
                { field: "data.b", color: "#222222" },
            ],
        });
        const item = await session.styles.add({
            name: "Item",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.pieColors.1": { value: "#00ff00" } },
        });
        await session.styles.settled();
        assert.deepStrictEqual(drawn(session, "n").colors, ["#111111", "#00ff00"]);

        await session.styles.remove(item.id);
        await session.styles.add({
            name: "Over",
            target: "node",
            selector: { match: "everything" },
            set: { "node.pieColors": "#abcdef" },
        });
        await session.styles.settled();
        assert.deepStrictEqual(drawn(session, "n").colors, ["#abcdef"]);
        assert.deepStrictEqual(drawn(session, "n").sizes, [0.25, 0.75], "the sizes beneath stand");
    });

    it("explains each filled list as encoded, from node.pieData", async () => {
        const { session, layerId } = await pieOf(ANIMALS, { entries: [{ field: "data.animals" }] });
        const explained = session.styles
            .explain({ node: "a" })
            .channels.find((each) => each.channel === "node.pieColors");
        assert.strictEqual(explained?.layerId, layerId);
        assert.strictEqual(explained?.mode, "encoded");
        assert.strictEqual(explained?.from, "node.pieData");
    });

    it("is one undo step, and undo restores the fixed lists it replaced", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "n", a: 1 }]);
        const layer = await session.styles.add({
            name: "Pie",
            target: "node",
            selector: { match: "everything" },
            set: { "node.pieColors": "red blue" },
        });
        // One write sets the spec and drops the fixed list: `set` is replaced whole.
        await session.styles.update(layer.id, { set: { "node.pieData": { entries: [{ field: "data.a" }] } } });
        await session.styles.settled();
        assert.strictEqual(drawn(session, "n").colors.length, 1);
        await session.undo();
        await session.styles.settled();
        assert.deepStrictEqual(drawn(session, "n").colors, ["red", "blue"]);
    });
});
