/**
 * @file `styles.counts(id).leftOut`: a "top N" takes a tie group whole or not at all, so a top by
 * a value every element shares (each node of a community carries its community's size) can take
 * none. The counts say why as a fact, rather than leaving "0 of 77" unexplained.
 */

import { assert, describe, it } from "vitest";

import { makeSession } from "../helpers";

describe("styles.counts: a top N a tie stopped short", () => {
    it("reports the tie when a top takes none, and nothing once the top fits", async () => {
        const { session } = makeSession();
        await session.data.addNodes([
            { id: "a", size: 3 },
            { id: "b", size: 3 },
            { id: "c", size: 3 },
            { id: "d", size: 1 },
        ]);
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "rule", where: { kind: "threshold", path: "data.size", top: 2 } },
            set: { "node.color": "#ff0000" },
        });

        const counts = session.styles.counts(layer.id);
        assert.strictEqual(counts.matched, 0);
        assert.deepStrictEqual(counts.leftOut, [
            { code: "top.tie", params: { path: "data.size", n: 2, taken: 0, value: 3, count: 3 } },
        ]);

        await session.styles.update(layer.id, {
            selector: { match: "rule", where: { kind: "threshold", path: "data.size", top: 3 } },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 3);
        assert.deepStrictEqual(session.styles.counts(layer.id).leftOut, []);
        session.dispose();
    });

    it("takes the tied group whole with ties all, and says how many more it took", async () => {
        const { session } = makeSession();
        await session.data.addNodes([
            { id: "a", size: 3 },
            { id: "b", size: 3 },
            { id: "c", size: 3 },
            { id: "d", size: 1 },
        ]);
        const layer = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "rule", where: { kind: "threshold", path: "data.size", top: 2, ties: "all" } },
            set: { "node.color": "#ff0000" },
        });

        const counts = session.styles.counts(layer.id);
        assert.strictEqual(counts.matched, 3, "you asked for 2; the third ties at 3");
        assert.deepStrictEqual(counts.leftOut, []);
        assert.deepStrictEqual(counts.tops, [
            {
                code: "top.tiesTaken",
                params: { path: "data.size", n: 2, taken: 3, ties: "all", value: 3, count: 3 },
            },
        ]);

        await session.styles.update(layer.id, {
            selector: { match: "rule", where: { kind: "threshold", path: "data.size", top: 3, ties: "all" } },
        });
        assert.deepStrictEqual(session.styles.counts(layer.id).tops, [
            { code: "top.exact", params: { path: "data.size", n: 3, taken: 3, ties: "all" } },
        ]);

        await session.styles.update(layer.id, {
            selector: { match: "rule", where: { kind: "threshold", path: "data.size", top: 9 } },
        });
        assert.deepStrictEqual(session.styles.counts(layer.id).tops, [
            { code: "top.fewerMeasured", params: { path: "data.size", n: 9, taken: 4, ties: "fewer" } },
        ]);
        session.dispose();
    });

    it("refuses a tie policy it does not know", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "a", size: 1 }]);
        let refused = false;
        try {
            await session.styles.add({
                name: "Top",
                target: "node",
                selector: {
                    match: "rule",
                    where: { kind: "threshold", path: "data.size", top: 1, ties: "some" as "all" },
                },
                set: { "node.color": "#ff0000" },
            });
        } catch {
            refused = true;
        }
        assert.isTrue(refused);
        session.dispose();
    });
});
