/**
 * @file A row that writes nothing yet, as a layer list's "Add layer" makes one: it is added in one
 * undo step, paints nothing, has no legend entry, and is never named as covering another layer.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

describe("an empty row", () => {
    it("is a real layer that paints nothing and has no legend entry", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const red = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        const row = await session.styles.addRow({ name: "Layer 1", target: "both", selector: { match: "everything" } });
        assert.strictEqual(row.target, "both");
        assert.isDefined(row.node);
        assert.isDefined(row.edge);

        assert.deepStrictEqual(
            session.styles.legendOf(row.node ?? ""),
            [],
            "no legend entry for a layer that sets nothing",
        );
        assert.isUndefined(
            session.styles.legend().find((block) => block.layerId === row.node || block.layerId === row.edge),
        );
        assert.deepStrictEqual(session.styles.counts(row.node ?? "").painted, {});
        assert.notInclude([...session.styles.counts(red.id).paintedBy], row.node, "it covers no other layer");

        await session.undo();
        assert.isUndefined(session.styles.get(row.node ?? ""), "one undo takes the whole row away");
        assert.isUndefined(session.styles.get(row.edge ?? ""));
        session.dispose();
    });
});
