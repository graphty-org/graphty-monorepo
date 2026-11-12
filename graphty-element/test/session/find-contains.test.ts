/**
 * @file Find's "contains" rows, each a live rule a layer can paint, and the layer selector a
 * selection offers: its rule while it was made by one, else its ids.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/**
 * Five people, three of them named with "bob" in some case, and a number column.
 * @returns The session, loaded.
 */
async function people(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", name: "Bob", age: 31 },
        { id: "b", name: "Bobby Tables", age: 12 },
        { id: "c", name: "Ann", age: 40 },
        { id: "d", name: "jimbob", age: 31 },
        { id: "e", name: "Eve", age: 5 },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "c", target: "d" },
    ]);
    return session;
}

describe("find's contains rows", () => {
    it("offers 'name contains bob' with every node whose name holds it, and a rule that holds the same", async () => {
        const session = await people();
        const found = session.find("bob");
        const row = found.contains?.find((r) => r.path === "data.name");
        assert.isDefined(row);
        assert.strictEqual(row.kind, "node");
        assert.strictEqual(row.count, 3);
        assert.strictEqual(row.text, "bob");
        assert.deepEqual(row.rule, { kind: "text", reads: "data.name", mode: "substring", text: "bob" });
        assert.deepEqual([...(row.target as { nodes: string[] }).nodes].sort(), ["a", "b", "d"]);
        const counted = await session.scope.count({
            define: { kind: "rule", where: row.rule, reading: "induced" },
        });
        assert.strictEqual(counted.nodes, 3);
    });

    it("leaves out number columns and an exact search", async () => {
        const session = await people();
        assert.isUndefined(session.find("3").contains?.find((r) => r.path === "data.age"));
        assert.isUndefined(session.find("exact:Bob").contains);
    });
});

describe("selection.layerSelector", () => {
    it("is the rule a selection was made from, then the ids once anything else changes it", async () => {
        const session = await people();
        await session.selection.apply({ text: "=age > `30`" });
        assert.deepEqual(session.selection.layerSelector, { match: "expression", where: "age > `30`" });
        await session.selection.apply({ where: "age < `10`" });
        assert.deepEqual(session.selection.layerSelector, { match: "expression", where: "age < `10`" });
        await session.selection.apply({ nodes: ["a"] }, "add");
        assert.deepEqual(session.selection.layerSelector, { match: "ids", nodes: ["a", "e"], edges: [] });
        await session.selection.apply({ text: "bob" });
        assert.strictEqual(session.selection.layerSelector.match, "ids");
    });
});
