/**
 * @file The `isolated` rule leaf selects exactly the nodes `statistics().components.isolatedCount`
 * counts, a node whose only edge is a self-loop included (issue #931).
 */

import { assert, describe, it } from "vitest";

import type { ScopeInput } from "../../src/catalog/types";
import { createGraphSession } from "../../src/session";

/** The isolated nodes, as a scope. */
const ISOLATED: ScopeInput = { define: { kind: "rule", where: { kind: "isolated" }, reading: "induced" } };

describe("the isolated rule leaf", () => {
    it("counts and selects the one-node components, self-loop-only nodes included", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "alone" }, { id: "loop" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "loop", target: "loop" },
            // c only receives an edge: it is not isolated.
            { source: "b", target: "c" },
        ]);

        const { isolatedCount } = session.data.statistics().components;
        assert.strictEqual(isolatedCount, 2);
        assert.strictEqual((await session.scope.count(ISOLATED)).nodes, isolatedCount);

        await session.selection.apply({ scope: ISOLATED });
        assert.sameMembers([...session.selection.nodes], ["alone", "loop"]);
        session.dispose();
    });

    it("hides the isolated nodes as a visibility filter", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "alone" }]);
        await session.data.addEdges([{ source: "a", target: "b" }]);

        await session.visibility.set({ kind: "not", of: { kind: "isolated" } });
        const visible = await session.scope.count("visible");
        assert.strictEqual(visible.nodes, 2);
        session.dispose();
    });

    it("refuses a field it does not take", async () => {
        const session = createGraphSession();
        let code: unknown;
        try {
            await session.scope.count({
                define: { kind: "rule", where: { kind: "isolated", depth: 1 } as never, reading: "induced" },
            });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
        session.dispose();
    });
});
