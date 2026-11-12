/**
 * @file A rule reads a node's structure with no run (`graphty.degree`, and in and out degree on a
 * directed graph), `selection.checkRule` offers it for a bare `degree`, and a find takes the words
 * a consumer shows for a yes-or-no value (`FindOptions.booleanWords`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * A hub "a" with three spokes, and one more edge from "b" to "c".
 * @param directed - Whether the graph is directed.
 * @returns The session, loaded.
 */
async function hub(directed = false): Promise<GraphSession> {
    const session = createGraphSession();
    await session.config.set({ data: { directed } });
    await session.data.addNodes([
        { id: "a", member: true },
        { id: "b", member: false },
        { id: "c", member: true },
        { id: "d" },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "b", target: "c" },
    ]);
    return session;
}

describe("a rule over a node's structure", () => {
    it("reads graphty.degree with no run", async () => {
        const session = await hub();

        assert.deepEqual(session.selection.checkRule("graphty.degree > `2`"), { unknown: [] });
        await session.selection.apply({ text: "=graphty.degree >= `2`" });
        assert.sameMembers([...session.selection.nodes], ["a", "b", "c"]);
        session.dispose();
    });

    it("offers graphty.degree for a bare degree, and the rewrite selects the hub", async () => {
        const session = await hub();

        const check = session.selection.checkRule("degree > `2`");

        assert.deepEqual(check.unknown, [{ path: "degree", candidates: ["graphty.degree"] }]);
        assert.strictEqual(check.suggestion, "graphty.degree > `2`");
        await session.selection.apply({ text: `=${check.suggestion ?? ""}` });
        assert.deepEqual([...session.selection.nodes], ["a"]);
        session.dispose();
    });

    it("offers a column of that name before the structure, so the rewrite stays one", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", Degree: 4 }, { id: "b" }]);

        const check = session.selection.checkRule("degree > `2`");

        assert.deepEqual(check.unknown, [{ path: "degree", candidates: ["data.Degree"] }]);
        assert.strictEqual(check.suggestion, "Degree > `2`");
        session.dispose();
    });

    it("reads in and out degree on a directed graph only", async () => {
        const directed = await hub(true);
        assert.strictEqual(directed.selection.checkRule("in_degree > `1`").suggestion, "graphty.inDegree > `1`");
        await directed.selection.apply({ text: "=graphty.outDegree == `3`" });
        assert.deepEqual([...directed.selection.nodes], ["a"]);
        directed.dispose();

        const undirected = await hub();
        assert.deepEqual(undirected.selection.checkRule("indegree > `1`").unknown, [
            { path: "indegree", candidates: [] },
        ]);
        undirected.dispose();
    });
});

describe("finding a yes-or-no value by its words", () => {
    it("finds true by the consumer's word for it, and by true as before", async () => {
        const session = await hub();
        const words = { true: "Yes", false: "No" };

        assert.lengthOf(session.find("yes").values, 0, "without the words, yes is no value");
        const yes = session.find("yes", { booleanWords: words }).values;
        assert.deepEqual(
            yes.map((row) => [row.path, row.value, row.count]),
            [["data.member", true, 2]],
        );
        const no = session.find("NO", { booleanWords: words }).values;
        assert.deepEqual(
            no.map((row) => [row.value, row.count]),
            [[false, 1]],
        );
        assert.lengthOf(session.find("true", { booleanWords: words }).values, 1);
        assert.lengthOf(session.find("ye", { booleanWords: words }).values, 0, "a yes-or-no value matches whole");
        session.dispose();
    });
});
