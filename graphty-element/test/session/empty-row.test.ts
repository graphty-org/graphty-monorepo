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

    it("may paint one kind: a row of nodes or of edges starts empty too", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "b" }]);

        const nodes = await session.styles.addRow({
            name: "2 nodes",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b"], edges: [] },
        });
        assert.strictEqual(nodes.target, "node");
        assert.isUndefined(nodes.edge);
        assert.deepStrictEqual(session.styles.counts(nodes.id).painted, {});
        const edges = await session.styles.addRow({
            name: "1 edge",
            target: "edge",
            selector: { match: "everything" },
        });
        assert.strictEqual(edges.target, "edge");

        await session.undo();
        assert.isUndefined(session.styles.get(edges.id), "one undo takes the row away");
        assert.isDefined(session.styles.get(nodes.id));
        session.dispose();
    });
    it("of one kind takes a new selector or name before it has a look, and paints once a value arrives", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", email: "x" }, { id: "b" }, { id: "c" }]);

        const row = await session.styles.addRow({
            name: "email: has a value",
            target: "node",
            selector: { match: "expression", where: "email" },
        });
        await session.styles.updateMany([
            {
                id: row.id,
                patch: {
                    name: "email: has no value",
                    selector: {
                        match: "rule",
                        where: { kind: "not", of: { kind: "text", reads: "data.email", mode: "regex", text: "" } },
                    },
                },
            },
        ]);
        assert.strictEqual(session.styles.get(row.id)?.name, "email: has no value");
        assert.deepStrictEqual(session.styles.counts(row.id).painted, {}, "it paints nothing yet");

        await session.styles.update(row.id, { set: { "node.color": "#ff0000" } });
        assert.strictEqual(session.styles.counts(row.id).matched, 2, "b and c have no email");
        assert.isAbove(Object.keys(session.styles.counts(row.id).painted).length, 0, "it paints once it has a value");

        let refused: unknown;
        try {
            await session.styles.update(row.id, { set: {} });
        } catch (error) {
            refused = error;
        }
        assert.strictEqual(
            (refused as { code?: string } | undefined)?.code,
            "E_BAD_LAYER",
            "emptying a layer with a value still needs keepEmpty",
        );
        session.dispose();
    });
});
