/**
 * @file `graphty.members` selects the groups: a node that holds others, named by plain node
 * records' `parent` key or by a file's containment, reads how many it holds directly, and every
 * other node reads nothing, so `{ match: "has", path: "graphty.members" }` paints the groups.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { fileStylesOn } from "../../helpers/file-styles-on";
import { NESTED_GROUPS, NESTED_XGMML, savedWithParentRows } from "../../helpers/nested-numeric-groups";

fileStylesOn();

/**
 * Check, through `graphty.members`, that exactly these nodes are groups, each holding this many.
 * @param session - The session.
 * @param groups - Each group and the nodes it holds directly.
 */
async function assertGroups(session: GraphSession, groups: Readonly<Record<string, readonly string[]>>): Promise<void> {
    for (const [group, members] of Object.entries(groups)) {
        const { id } = await session.styles.add({
            name: `Group ${group}`,
            target: "node",
            selector: {
                match: "expression",
                // A file's id is held as text; either spelling names the node.
                where: `(id == '${group}' || id == \`${JSON.stringify(group)}\`) && graphty.members == \`${members.length}\``,
            },
            set: { "node.size": 2 },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(id).matched, 1, `${group} holds ${members.length}`);
    }

    assert.strictEqual(await groupsSelected(session), Object.keys(groups).length, "no other node is a group");
}

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

    it("keeps a file's nested groups, its ids numbers, by node id, not by row, through a save and an open", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "xgmml", config: { data: NESTED_XGMML } }, { styles: "file" });
        await assertGroups(session, NESTED_GROUPS);
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession();
        assert.deepEqual((await opened.project.open(text)).problems, []);
        await assertGroups(opened, NESTED_GROUPS);
    });

    it("opens a project saved when the parent key held the parent's row with every node in its group", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "xgmml", config: { data: NESTED_XGMML } }, { styles: "file" });
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession();
        assert.deepEqual((await opened.project.open(savedWithParentRows(text))).problems, []);
        await assertGroups(opened, NESTED_GROUPS);
    });

    it("keeps plain records' parent keys through a save and an open", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "team" }, { id: "ana", parent: "team" }, { id: "bo", parent: "team" }]);
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession();
        await opened.project.open(text);
        await assertGroups(opened, { team: ["ana", "bo"] });
    });
});
