/**
 * @file A chart from data (`node.chartData`): a pattern in natural order ignoring case, a column loaded later
 * joining it, except, series by a name part, a box's five numbers, the shared, per-node and set scales with clip
 * and normalize, a cells ramp, and missing values as a gap, zero or gray.
 */

import { assert, describe, it } from "vitest";

import type { ChartData } from "../../../src/catalog/data-lists";
import { createGraphSession } from "../../../src/session";

type Session = ReturnType<typeof createGraphSession>;

/**
 * A session holding these nodes, with one chart layer over every node.
 * @param nodes - The nodes.
 * @param chart - The chart spec.
 * @param kind - The chart kind the layer sets, if any.
 * @returns The session and the layer id.
 */
async function chartOf(
    nodes: readonly Record<string, unknown>[],
    chart: ChartData,
    kind?: string,
): Promise<{ session: Session; layerId: string }> {
    const session = createGraphSession();
    await session.data.addNodes(nodes);
    const layer = await session.styles.add({
        name: "Chart",
        target: "node",
        selector: { match: "everything" },
        set: { "node.chartData": chart, ...(kind === undefined ? {} : { "node.chartKind": kind }) },
    });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * The chart one node draws.
 * @param session - The session.
 * @param node - The node.
 * @returns Its values, colors and range.
 */
function drawn(session: Session, node: string): { values: string; colors: string[]; min: unknown; max: unknown } {
    const merged = session.styles.explain({ node }).merged as Record<string, unknown>;
    return {
        values: (merged["node.chartValues"] as string | undefined) ?? "",
        colors: ((merged["node.chartColors"] as string | undefined) ?? "").split(" ").filter((w) => w !== ""),
        min: merged["node.chartMin"],
        max: merged["node.chartMax"],
    };
}

const GENES = [
    { id: "g1", expr_10: 10, EXPR_2: 2, expr_1: 1, other: 5 },
    { id: "g2", expr_10: 20, EXPR_2: 4, other: 7 },
];

describe("a chart from data", () => {
    it("reads a pattern's columns in natural order, ignoring case, a missing one a gap", async () => {
        const { session } = await chartOf(GENES, { entries: [{ pattern: "expr_" }] });
        assert.strictEqual(drawn(session, "g1").values, "1 2 10");
        assert.strictEqual(drawn(session, "g2").values, "NaN 4 20", "g2 has no expr_1: its place is a gap");
    });

    it("takes every other number column with except", async () => {
        const { session } = await chartOf(GENES, { entries: [{ pattern: "expr_", except: true }] });
        assert.strictEqual(drawn(session, "g1").values, "5");
    });

    it("joins a column loaded later", async () => {
        const { session } = await chartOf(GENES, { entries: [{ pattern: "expr_" }] });
        await session.data.addNodes([{ id: "g3", expr_3: 3 }]);
        await session.styles.settled();
        assert.strictEqual(drawn(session, "g1").values, "1 2 NaN 10");
    });

    it("colors by series, a column's name up to its last separator", async () => {
        const { session } = await chartOf([{ id: "n", ctrl_1: 1, ctrl_2: 2, kd_1: 3 }], {
            entries: [{ pattern: "" }],
            series: { separator: "_" },
        });
        const { colors } = drawn(session, "n");
        assert.strictEqual(colors[0], colors[1], "ctrl_1 and ctrl_2 are one series");
        assert.notStrictEqual(colors[0], colors[2]);
    });

    it("draws a box from the five-number summary", async () => {
        const { session } = await chartOf([{ id: "n", v: [1, 2, 3, 4, 5] }], { entries: [{ field: "data.v" }] }, "box");
        assert.strictEqual(drawn(session, "n").values, "1 2 3 4 5");
    });

    it("shares one scale over the layer's nodes, or gives each node its own, or a set one", async () => {
        const shared = await chartOf(GENES, { entries: [{ pattern: "expr_" }] });
        assert.deepStrictEqual([drawn(shared.session, "g1").min, drawn(shared.session, "g1").max], [0, 20]);

        const own = await chartOf(GENES, { entries: [{ pattern: "expr_" }], scale: { share: "node" } });
        assert.deepStrictEqual([drawn(own.session, "g1").min, drawn(own.session, "g1").max], [0, 10]);

        const set = await chartOf(GENES, { entries: [{ pattern: "expr_" }], scale: { min: -5, max: 50 } });
        assert.deepStrictEqual([drawn(set.session, "g2").min, drawn(set.session, "g2").max], [-5, 50]);

        const clipped = await chartOf(GENES, { entries: [{ pattern: "expr_" }], scale: { clip: [0, 50] } });
        assert.strictEqual(drawn(clipped.session, "g1").max, 4, "the median of 1 2 4 10 20 is 4");
    });

    it("normalizes each series to shares or ranks", async () => {
        const share = await chartOf([{ id: "n", a: 1, b: 3 }], {
            entries: [{ pattern: "" }],
            series: { separator: "_" },
            scale: { normalize: "share", share: "node" },
        });
        assert.strictEqual(drawn(share.session, "n").values, "1 1", "each column its own series: a share of 1");

        const rank = await chartOf([{ id: "n", v: [30, 10, 20] }], {
            entries: [{ field: "data.v" }],
            scale: { normalize: "rank" },
        });
        assert.strictEqual(drawn(rank.session, "n").values, "3 1 2");
    });

    it("colors cells from a ramp", async () => {
        const { session } = await chartOf(
            [{ id: "n", v: [0, 10] }],
            { entries: [{ field: "data.v" }], colors: ["#000000", "#ffffff"], scale: { share: "node" } },
            "cells",
        );
        assert.deepStrictEqual(
            drawn(session, "n").colors.map((each) => each.toLowerCase()),
            ["#000000", "#ffffff"],
        );
    });

    it("reads a missing value as zero, or as a short gray bar from the low end", async () => {
        const zero = await chartOf([{ id: "n", a: 4 }], {
            entries: [{ field: "data.a" }, { field: "data.b", missing: "zero" }],
        });
        assert.strictEqual(drawn(zero.session, "n").values, "4 0");

        const gray = await chartOf([{ id: "n", a: 4 }], {
            entries: [{ field: "data.a" }, { field: "data.b", missing: "gray" }],
        });
        // A tenth of the scale (0 to 4): a mark, never read as the top value.
        assert.strictEqual(drawn(gray.session, "n").values, "4 0.4");
        assert.strictEqual(drawn(gray.session, "n").colors[1], "#BDBDBD");
    });
});
