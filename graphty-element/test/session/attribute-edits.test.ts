/**
 * @file Editing a node's or an edge's attributes after load (`session.data.updateNodes`,
 * `updateEdges`): a style rule and a filter that read the attribute follow the edit, and undo
 * takes it back.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const RED = "#ff0000";

/**
 * The color the layers paint one node or edge.
 * @param session - The session.
 * @param target - The node or the edge.
 * @param channel - The color channel.
 * @returns The color's hex, or undefined when no layer paints it.
 */
function colorOf(
    session: GraphSession,
    target: { node: string } | { edge: string },
    channel: "node.color" | "edge.color",
): string | undefined {
    const color = (session.styles.explain(target).merged as Record<string, { hex?: string } | undefined>)[channel];
    return color?.hex;
}

describe("editing attributes after load", () => {
    it("repaints a node rule that reads the edited attribute, through undo and redo too", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", status: "new" },
            { id: "b", status: "new" },
        ]);
        await session.styles.add({
            name: "Reviewed",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.status", values: ["reviewed"] } },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.notStrictEqual(colorOf(session, { node: "a" }, "node.color"), RED);

        await session.data.updateNodes([{ id: "a", values: { status: "reviewed" } }]);
        await session.styles.settled();
        assert.strictEqual(colorOf(session, { node: "a" }, "node.color"), RED);
        assert.notStrictEqual(colorOf(session, { node: "b" }, "node.color"), RED);

        await session.undo();
        await session.styles.settled();
        assert.notStrictEqual(colorOf(session, { node: "a" }, "node.color"), RED);

        await session.redo();
        await session.styles.settled();
        assert.strictEqual(colorOf(session, { node: "a" }, "node.color"), RED);
        session.dispose();
    });

    it("repaints an edge rule that reads the edited attribute", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "b", status: "new" }]);
        const [edge] = session.data.edges();
        await session.styles.add({
            name: "Reviewed edges",
            target: "edge",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.status", values: ["reviewed"] } },
            set: { "edge.color": RED },
        });
        await session.styles.settled();
        assert.notStrictEqual(colorOf(session, { edge: edge.id }, "edge.color"), RED);

        await session.data.updateEdges([{ id: edge.id, values: { status: "reviewed" } }]);
        await session.styles.settled();
        assert.strictEqual(colorOf(session, { edge: edge.id }, "edge.color"), RED);
        session.dispose();
    });

    it("changes the result of a filter on the edited attribute", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", type: "hub" },
            { id: "b", type: "leaf" },
            { id: "c", type: "leaf" },
        ]);
        await session.visibility.set({ kind: "categories", attribute: "data.type", values: ["hub"] });
        assert.deepEqual([...session.visibility.nodes], ["a"]);

        await session.data.updateNodes([
            { id: "a", values: { type: "leaf" } },
            { id: "c", values: { type: "hub" } },
        ]);
        assert.deepEqual([...session.visibility.nodes], ["c"]);

        await session.undo();
        assert.deepEqual([...session.visibility.nodes], ["a"]);
        session.dispose();
    });
});
