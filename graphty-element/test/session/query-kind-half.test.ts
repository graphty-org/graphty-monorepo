/**
 * @file A rule about a column one kind of element does not carry matches none of that kind: the
 * query engine's promise that a path nothing answers matches nothing, held per kind.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/** 24 volunteers, seven with no phone, and 63 ties; no edge carries a column. */
const VOLUNTEERS = readFileSync(
    new URL("../../../design/ui/studio/tool/files/volunteers.graphml", import.meta.url),
    "utf8",
);

/**
 * A session holding the volunteers.
 * @returns the session
 */
async function volunteers(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({
        config: { data: VOLUNTEERS, format: "graphml" },
        name: "volunteers.graphml",
    });
    await draft.load();
    return session;
}

/**
 * Two people and two ties: `age` only on nodes, `km` only on edges, `kind` on both.
 * @returns the session
 */
async function mixed(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", age: 30, kind: "x" },
        { id: "b", kind: "y" },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b", km: 5, kind: "x" },
        { src: "b", dst: "a", kind: "y" },
    ]);
    return session;
}

/**
 * How many of each kind a rule selects.
 * @param session - the session
 * @param where - the rule
 * @returns the two counts
 */
async function counted(session: GraphSession, where: string): Promise<{ nodes: number; edges: number }> {
    const { nodes, edges } = await session.selection.count({ where });
    return { nodes, edges };
}

describe("a rule read per kind of element", () => {
    it("takes no edge for a negative test on a node column", async () => {
        const session = await volunteers();

        assert.deepStrictEqual(await counted(session, "data.phone == `null`"), { nodes: 7, edges: 0 });
        assert.deepStrictEqual(await counted(session, "phone == `null`"), { nodes: 7, edges: 0 });
    });

    it("pages the same as it selects", async () => {
        const session = await volunteers();

        assert.strictEqual(session.data.nodePage({ where: "data.phone == `null`", limit: 0 }).total, 7);
        assert.strictEqual(session.data.edgePage({ where: "data.phone == `null`", limit: 0 }).total, 0);
    });

    it("takes no node for a negative test on an edge column", async () => {
        const session = await mixed();

        assert.deepStrictEqual(await counted(session, "data.km == `null`"), { nodes: 0, edges: 1 });
    });

    it("still gives a rule on an edge column its edges", async () => {
        const session = await mixed();

        assert.deepStrictEqual(await counted(session, "data.km == `5`"), { nodes: 0, edges: 1 });
        assert.deepStrictEqual(await counted(session, "km == `5`"), { nodes: 0, edges: 1 });
    });

    it("leaves a column both kinds carry alone", async () => {
        const session = await mixed();

        assert.deepStrictEqual(await counted(session, "data.kind == 'x'"), { nodes: 1, edges: 1 });
        assert.deepStrictEqual(await counted(session, "data.kind != 'x'"), { nodes: 1, edges: 1 });
    });

    it("keeps a kind that answers one of the rule's paths", async () => {
        const session = await mixed();

        assert.deepStrictEqual(await counted(session, "data.age == `30` || data.km == `5`"), { nodes: 1, edges: 1 });
    });

    it("matches nothing for a path neither kind answers, and still reports it", async () => {
        const session = await mixed();

        assert.deepStrictEqual(await counted(session, "data.nope == `null`"), { nodes: 0, edges: 0 });
        const delta = await session.selection.apply({ where: "data.nope == `null`" });
        assert.deepStrictEqual([...delta.unresolvedPaths], ["data.nope"]);
    });
});
