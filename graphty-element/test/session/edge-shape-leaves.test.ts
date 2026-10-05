/**
 * @file The `self-loop` and `repeated-edge` rule leaves select exactly the edges
 * `statistics().selfLoopCount` and `statistics().repeatedEdgeCount` count (issue #899).
 */

import { assert, describe, it } from "vitest";

import type { RuleTree, ScopeInput } from "../../src/catalog/types";
import { createGraphSession } from "../../src/session";

/**
 * A rule set of one leaf, read `listed`: the edges and their endpoints.
 * @param where - The leaf.
 * @returns The scope.
 */
function listed(where: RuleTree): ScopeInput {
    return { define: { kind: "rule", where, reading: "listed" } };
}

/**
 * A session over a multigraph: a-b three times (one reversed), one self-loop on c twice, and b-c.
 * @param directed - Whether the file says the graph is directed.
 * @returns The session.
 */
async function multigraph(directed: boolean): Promise<ReturnType<typeof createGraphSession>> {
    const session = createGraphSession();
    const edges = [
        [1, 2],
        [1, 2],
        [2, 1],
        [3, 3],
        [3, 3],
        [2, 3],
    ]
        .map(([source, target]) => `edge [ source ${String(source)} target ${String(target)} ]`)
        .join(" ");
    const data = `graph [ directed ${directed ? 1 : 0} node [ id 1 ] node [ id 2 ] node [ id 3 ] ${edges} ]`;
    await session.data.import({ type: "gml", config: { data } });
    return session;
}

describe("the self-loop and repeated-edge rule leaves", () => {
    for (const directed of [true, false]) {
        it(`count what statistics() counts on a ${directed ? "directed" : "undirected"} graph`, async () => {
            const session = await multigraph(directed);
            const statistics = session.data.statistics();

            const loops = await session.scope.count(listed({ kind: "self-loop" }));
            const repeats = await session.scope.count(listed({ kind: "repeated-edge" }));
            assert.strictEqual(loops.edges, statistics.selfLoopCount);
            assert.strictEqual(repeats.edges, statistics.repeatedEdgeCount);
            // Directed: a-b once more and c-c once more. Undirected: a-b twice more, c-c once more.
            assert.strictEqual(statistics.repeatedEdgeCount, directed ? 2 : 3);
            session.dispose();
        });
    }

    it("selects the edges through selection.apply({ scope })", async () => {
        const session = await multigraph(true);
        await session.selection.apply({ scope: listed({ kind: "self-loop" }) });

        assert.strictEqual(session.selection.edges.length, 2);
        assert.deepStrictEqual([...session.selection.nodes], [3]);
        for (const id of session.selection.edges) {
            const edge = session.data.edge(id);
            assert.strictEqual(edge?.source, edge?.target);
        }

        session.dispose();
    });

    it("is refused under an induced reading, which would ignore an edge leaf", async () => {
        const session = await multigraph(true);
        let code: unknown;
        try {
            await session.scope.count({ define: { kind: "rule", where: { kind: "self-loop" }, reading: "induced" } });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
        session.dispose();
    });
});
