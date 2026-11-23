/**
 * @file Copies of one binding that folds its smaller categories into "other": the folded block
 * keeps the "other" row only when a copy meets a category folded into it, sums the copies'
 * selections into one scope, and a ramp whose two ends paint the same states no direction.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { LegendBlock } from "../../../src/session/styles/legend";

/** Twelve one-node kinds, k00 to k11, and a two-node kind zz no copy selects. */
const KINDS = Array.from({ length: 12 }, (_, at) => `k${String(at).padStart(2, "0")}`);

/**
 * A session over the kinds with one layer per part, each a copy of one ordinal color binding
 * that folds what the palette cannot hold into "other".
 * @param parts - The kinds each copy selects.
 * @returns The session and the copies' layer ids.
 */
async function copies(parts: readonly (readonly string[])[]): Promise<{ s: GraphSession; ids: string[] }> {
    const s = createGraphSession();
    await s.data.addNodes([
        ...KINDS.map((kind, at) => ({ id: `n${String(at)}`, kind })),
        { id: "x1", kind: "zz" },
        { id: "x2", kind: "zz" },
    ]);
    const ids: string[] = [];
    for (const part of parts) {
        const layer = await s.styles.add({
            name: part[0],
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: [...part] } },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito", overflow: "other" } },
        });
        ids.push(layer.id);
    }
    await s.styles.settled();
    return { s, ids };
}

/**
 * The one color block.
 * @param s - The session.
 * @returns The block.
 */
function colorBlock(s: GraphSession): LegendBlock {
    const blocks = s.styles.legend().filter((block) => block.channel === "node.color");
    assert.lengthOf(blocks, 1);
    return blocks[0];
}

describe("copies of a binding with an other bucket", () => {
    it("keeps the other row when a copy meets a folded category, and sums the copies' selections", async () => {
        const { s, ids } = await copies([KINDS.slice(0, 6), KINDS.slice(6)]);
        const block = colorBlock(s);

        assert.deepEqual(block.layers, ids);
        assert.deepEqual(block.scope, { count: 12, of: 14, visible: 14 }, "every kind but zz");
        assert.strictEqual(block.painted, 12);
        const other = block.swatches.find((swatch) => swatch.role === "other");
        assert.deepEqual(other?.value, ["k07", "k08", "k09", "k10", "k11"]);
        assert.deepEqual(
            block.swatches.filter((swatch) => swatch.role !== "other").map((swatch) => swatch.value),
            KINDS.slice(0, 7),
            "zz has a color of its own but no copy meets it",
        );
        assert.isTrue(block.facts.some((fact) => fact.code === "legend.lumped"));
        s.dispose();
    });

    it("drops the other row and its fact when no copy meets a folded category", async () => {
        const { s, ids } = await copies([KINDS.slice(0, 3), KINDS.slice(3, 6)]);
        const block = colorBlock(s);

        assert.deepEqual(block.layers, ids);
        assert.deepEqual(block.scope, { count: 6, of: 14, visible: 14 });
        assert.isUndefined(block.swatches.find((swatch) => swatch.role === "other"));
        assert.deepEqual(
            block.swatches.map((swatch) => swatch.value),
            KINDS.slice(0, 6),
        );
        assert.isFalse(block.facts.some((fact) => fact.code === "legend.lumped"));
        s.dispose();
    });

    it("gives no scope when the copies together select every node", async () => {
        const { s } = await copies([[...KINDS.slice(0, 6), "zz"], KINDS.slice(6)]);
        assert.isUndefined(colorBlock(s).scope);
        s.dispose();
    });
});

describe("an other bucket with hidden categories", () => {
    it("gives each hidden folded category a hidden row, and drops the bucket's row once all are hidden", async () => {
        const { s, ids } = await copies([[...KINDS, "zz"]]);
        const [layer] = ids;
        const folded = KINDS.slice(7);

        await s.styles.setValueHidden(layer, "node.color", folded[0], true);
        await s.styles.settled();
        let block = colorBlock(s);
        assert.deepEqual(
            block.swatches.find((swatch) => swatch.role === "other"),
            { ...block.swatches.find((swatch) => swatch.role === "other"), value: folded.slice(1), count: 4 },
            "the bucket counts only what it still paints",
        );
        assert.isTrue(block.swatches.find((swatch) => swatch.value === folded[0])?.hidden);

        for (const kind of folded.slice(1)) {
            await s.styles.setValueHidden(layer, "node.color", kind, true);
        }
        await s.styles.settled();
        block = colorBlock(s);
        assert.isUndefined(block.swatches.find((swatch) => swatch.role === "other"));
        assert.lengthOf(block.swatches, 12, "thirteen rows: zz, k00 to k06 and five hidden ones, past the cap of 12");
        assert.deepEqual(block.overflow, { hidden: 1 });
        assert.deepEqual(
            block.swatches.filter((swatch) => swatch.hidden === true).map((swatch) => swatch.value),
            folded.slice(0, 4),
        );
        s.dispose();
    });
});

describe("a ramp whose two ends paint the same", () => {
    it("states no direction for a size range of one value", async () => {
        const s = createGraphSession();
        await s.data.addNodes(KINDS.map((kind, at) => ({ id: kind, w: at })));
        await s.styles.add({
            name: "Flat",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.w", scale: "linear", range: [2, 2] } },
        });
        await s.styles.settled();

        const [block] = s.styles.legend().filter((each) => each.channel === "node.size");
        assert.strictEqual(block.kind, "sequential");
        assert.deepEqual(block.range, { min: 2, max: 2 });
        assert.isUndefined(block.reading);
        assert.deepEqual(block.domain, { min: 0, max: 11 });
        s.dispose();
    });
});
