/**
 * @file `session.selection.origin`: the target the selection was made from (issue #898).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * A star around "Javert", plus one stranger.
 * @returns the session
 */
async function star(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "Javert" }, { id: "Valjean" }, { id: "Cosette" }, { id: "Stranger" }]);
    await session.data.addEdges([
        { source: "Javert", target: "Valjean" },
        { source: "Cosette", target: "Javert" },
    ]);
    return session;
}

describe("session.selection.origin", () => {
    it("names a neighborhood target while the selection is exactly that neighborhood", async () => {
        const session = await star();
        assert.isNull(session.selection.origin);

        const target = { neighborsOf: ["Javert"] };
        await session.selection.apply(target);
        assert.deepStrictEqual(session.selection.origin, target);
        assert.sameMembers([...session.selection.nodes], ["Javert", "Valjean", "Cosette"]);
        session.dispose();
    });

    it("is replaced by any later change", async () => {
        const session = await star();
        await session.selection.apply({ neighborsOf: ["Javert"] });
        await session.selection.apply({ nodes: ["Stranger"] }, "add");
        assert.isNull(session.selection.origin, "an add leaves a selection no one target names");

        await session.selection.apply({ neighborsOf: ["Javert"] });
        await session.selection.apply({ nodes: ["Valjean"] });
        assert.deepStrictEqual(session.selection.origin, { nodes: ["Valjean"] });

        session.selection.clear();
        assert.isNull(session.selection.origin);
        session.dispose();
    });

    it("is a frozen copy the caller's later edits do not reach", async () => {
        const session = await star();
        const target = { neighborsOf: ["Javert"] };
        await session.selection.apply(target);
        target.neighborsOf.push("Stranger");

        const { origin } = session.selection;
        assert.deepStrictEqual(origin, { neighborsOf: ["Javert"] });
        assert.isTrue(Object.isFrozen(origin));
        session.dispose();
    });

    it("is null once the graph changes, since the target may name something else now", async () => {
        const session = await star();
        await session.selection.apply({ neighborsOf: ["Javert"] });
        await session.data.addEdges([{ source: "Javert", target: "Stranger" }]);
        assert.isNull(session.selection.origin, "the neighborhood grew; the selection did not");

        await session.selection.apply({ neighborsOf: ["Javert"] });
        await session.data.removeNodes(["Valjean"]);
        assert.isNull(session.selection.origin, "a removal pruned the selection");
        session.dispose();
    });

    it("is null after a click or an undo, which select a plain list nobody passed", async () => {
        const session = await star();
        await session.selection.apply({ neighborsOf: ["Javert"] });
        session.selection.applyNow({ nodes: ["Valjean"] }, "replace", "user");
        assert.isNull(session.selection.origin);

        await session.data.addNodes([{ id: "Late" }]);
        await session.selection.apply({ nodes: ["Late"] });
        await session.undo();
        assert.isNull(session.selection.origin);
        session.dispose();
    });
});
