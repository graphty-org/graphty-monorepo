/**
 * @file `graphty.members` selects the groups: a node that holds others, named by plain node
 * records' `parent` key or by a file's containment, reads how many it holds directly, and every
 * other node reads nothing, so `{ match: "has", path: "graphty.members" }` paints the groups.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * Add a layer that selects the groups, and say how many nodes it selects.
 * @param session - The session.
 * @returns The count.
 */
async function groupsSelected(session: GraphSession): Promise<number> {
    const { id } = await session.styles.add({
        name: "Groups",
        target: "node",
        selector: { match: "has", path: "graphty.members" },
        set: { "node.color": "#cccccc" },
    });
    await session.styles.settled();
    return session.styles.counts(id).matched;
}

describe("graphty.members", () => {
    it("selects the nodes plain records name as their parent, an inner group included", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "outer" },
            { id: "inner", parent: "outer" },
            { id: "a", parent: "inner" },
            { id: "b", parent: "inner" },
            { id: "c", parent: "outer" },
            { id: "free" },
        ]);
        assert.strictEqual(await groupsSelected(session), 2);
        const { id } = await session.styles.add({
            name: "Two members",
            target: "node",
            selector: { match: "expression", where: "graphty.members == `2`" },
            set: { "node.size": 2 },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(id).matched, 2, "outer holds inner and c; inner holds a and b");
    });

    it("follows a later add that puts a node in a group", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "team" }, { id: "ana" }]);
        assert.strictEqual(await groupsSelected(session), 0);
        await session.data.addNodes([{ id: "bo", parent: "team" }]);
        await session.styles.settled();
        const [layer] = session.styles.list().filter((each) => each.name === "Groups");
        assert.strictEqual(session.styles.counts(layer.id).matched, 1);
    });

    it("selects a Cytoscape.js compound node", async () => {
        const session = createGraphSession();
        const doc = {
            elements: [
                { data: { id: "team" } },
                { data: { id: "ana", parent: "team" } },
                { data: { id: "bo", parent: "team" } },
                { data: { id: "dee" } },
                { data: { id: "e1", source: "ana", target: "dee" } },
            ],
        };
        await session.data.import({ type: "json", config: { data: JSON.stringify(doc) } });
        assert.strictEqual(await groupsSelected(session), 1);
    });
});
