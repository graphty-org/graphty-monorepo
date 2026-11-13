/**
 * @file Removing or editing a join that adds edges takes only what the join added: its edges and
 * the nodes it made as new ends. Nodes the graph held before the join stay, however they got
 * there (issue #6482).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const keys = [
    { file: "from", graph: "id" },
    { file: "to", graph: "id" },
];

/**
 * A session holding a, b and c added with addNodes, with an edges table joined onto it that
 * names a fourth node, d, the graph does not hold.
 * @returns the session
 */
async function joined(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const draft = await session.data.prepare(
        { config: { file: new File(["from,to\na,b\nb,c\nc,d\n"], "links.csv") }, name: "links.csv" },
        { onto: "graph" },
    );
    await draft.load({ join: { shape: "edges", keys } });
    return session;
}

/**
 * The node ids, sorted.
 * @param session - the session
 * @returns the ids
 */
function ids(session: GraphSession): string[] {
    return session.data
        .nodes()
        .map((node) => String(node.id))
        .sort();
}

describe("removing a join that adds edges", () => {
    it("keeps the nodes the graph held before it, and takes the ends it made", async () => {
        const session = await joined();
        assert.deepEqual(ids(session), ["a", "b", "c", "d"]);
        assert.lengthOf(session.data.edges(), 3);

        await session.data.removeSource(session.data.joins()[0].source);
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 0);

        await session.undo();
        assert.deepEqual(ids(session), ["a", "b", "c", "d"]);
        assert.lengthOf(session.data.edges(), 3);

        await session.redo();
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("re-runs an edit over the nodes it did not make", async () => {
        const session = await joined();
        const [join] = session.data.joins();
        await session.data.editJoin(join.source, { ...join.choices, repeated: "last" });
        assert.deepEqual(ids(session), ["a", "b", "c", "d"]);
        assert.lengthOf(session.data.edges(), 3);
        session.dispose();
    });

    it("keeps the nodes the graph held when a newer copy of the table replaces it", async () => {
        const session = await joined();
        const [join] = session.data.joins();
        const copy = new File(["from,to\nb,c\nc,d\nd,e\n"], "links.csv");
        await session.data.replaceSource(join.source, { config: { file: copy }, name: "links.csv" });
        assert.deepEqual(ids(session), ["a", "b", "c", "d", "e"]);
        assert.lengthOf(session.data.edges(), 3);

        await session.data.removeSource(join.source);
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("re-runs an edit of a link over nodes added with addNodes", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const draft = await session.data.prepare(
            { config: { data: "account,phone\na,p1\nb,p1\nc,p2\n" }, name: "phones.csv" },
            { onto: "graph" },
        );
        const link = { columns: ["phone"] };
        await draft.load({ join: { keys: [{ file: "account", graph: "id" }], shape: "link", link } });
        assert.lengthOf(session.data.edges(), 1);

        const [join] = session.data.joins();
        await session.data.editJoin(join.source, { ...join.choices, names: { shared: "overlap" } });
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 1);

        await session.data.removeSource(join.source);
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });
});
