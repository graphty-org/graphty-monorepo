/**
 * `session.data.count()` gives the graph's node and edge counts without building a record:
 * what a reader shows as "1,234 nodes" reads it instead of `nodes().length`.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("session.data.count", () => {
    it("is zero on an empty graph", () => {
        const session = createGraphSession();
        assert.deepStrictEqual(session.data.count(), { nodes: 0, edges: 0 });
        session.dispose();
    });

    it("follows adds, removes and undo, and agrees with the record lists", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        assert.deepStrictEqual(session.data.count(), { nodes: 3, edges: 2 });

        await session.data.removeNodes(["c"]);
        const after = session.data.count();
        assert.deepStrictEqual(after, { nodes: 2, edges: 1 });
        assert.strictEqual(after.nodes, session.data.nodes().length);
        assert.strictEqual(after.edges, session.data.edges().length);

        await session.undo();
        assert.deepStrictEqual(session.data.count(), { nodes: 3, edges: 2 });
        session.dispose();
    });
});
