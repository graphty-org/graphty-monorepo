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

    it("is null after an undo, which reselects a plain list nobody passed", async () => {
        const session = await star();
        await session.data.addNodes([{ id: "Late" }]);
        await session.selection.apply({ nodes: ["Late"] });
        await session.undo();
        assert.isNull(session.selection.origin);
        session.dispose();
    });
});

describe("session.selection.originPaths", () => {
    it("names the columns a rule tested, while the selection is still that rule", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "Station" }, { id: "Stadium" }, { id: "Park" }]);
        await session.data.addEdges([
            { source: "Station", target: "Stadium", minutes: 7 },
            { source: "Stadium", target: "Park", minutes: 3 },
        ]);
        assert.deepStrictEqual([...session.selection.originPaths], []);

        await session.selection.apply({ text: "=minutes > `5`" });
        assert.strictEqual(session.selection.edges.length, 1);
        assert.deepStrictEqual([...session.selection.originPaths], ["data.minutes"]);

        await session.selection.apply({ where: "minutes < `5`" });
        assert.deepStrictEqual([...session.selection.originPaths], ["data.minutes"]);

        await session.selection.apply({ nodes: ["Park"] });
        assert.deepStrictEqual([...session.selection.originPaths], [], "not a rule");
        session.dispose();
    });
});

describe("selection:origin-changed", () => {
    it("tells subscribers when a rule selects exactly what is already selected", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "Station" }, { id: "Stadium" }, { id: "Park" }]);
        await session.data.addEdges([
            { source: "Station", target: "Stadium", minutes: 12 },
            { source: "Stadium", target: "Park", minutes: 3 },
        ]);
        const membership: number[] = [];
        const origins: unknown[] = [];
        session.on("selection:changed", (delta) => membership.push(delta.edges));
        session.on("selection:origin-changed", ({ origin }) => origins.push(origin));

        await session.selection.apply({ text: "=minutes >= `10`" });
        assert.deepStrictEqual(membership, [1]);
        assert.deepStrictEqual(origins, [], "the members moved, so selection:changed said it");

        await session.selection.apply({ text: "=minutes > `9`" });
        assert.deepStrictEqual(session.selection.origin, { text: "=minutes > `9`" });
        assert.deepStrictEqual(membership, [1], "no member moved");
        assert.deepStrictEqual(origins, [{ text: "=minutes > `9`" }]);

        await session.selection.apply({ text: "=minutes > `9`" });
        assert.strictEqual(origins.length, 1, "the same rule again changes nothing");
        session.dispose();
    });
});
