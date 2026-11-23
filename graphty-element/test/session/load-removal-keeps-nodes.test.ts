/**
 * @file Removing a plain load (not a join) takes only the nodes it made: nodes the graph held
 * before it that no load supplied, such as nodes `addNodes` made, stay (issue #7708).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type DataChange, type GraphSession } from "../../session";

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

/**
 * A session holding a and b added with addNodes, with an edge list loaded over them that names a
 * third node, c, the graph does not hold.
 * @returns the session and the load's key
 */
async function loaded(): Promise<{ session: GraphSession; key: string }> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await session.data.import(
        { type: "csv", config: { data: "source,target\na,b\nb,c\n" }, name: "links.csv" },
        { mode: "merge" },
    );
    const [load] = session.data.sources();
    return { session, key: load.key };
}

describe("removing a plain load", () => {
    it("keeps the nodes addNodes made, and takes the ends the load made", async () => {
        const { session, key } = await loaded();
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 2);
        const events: DataChange[] = [];
        session.on("data:changed", (change) => {
            events.push(change);
        });

        await session.data.removeSource(key);
        assert.deepEqual(ids(session), ["a", "b"]);
        assert.lengthOf(session.data.edges(), 0);
        assert.deepEqual([...(events.at(-1)?.removed.nodes ?? [])].map(String), ["c"]);

        await session.undo();
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 2);

        await session.redo();
        assert.deepEqual(ids(session), ["a", "b"]);
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("still keeps them after the load is undone and redone", async () => {
        const { session, key } = await loaded();
        await session.undo();
        assert.deepEqual(ids(session), ["a", "b"]);
        await session.redo();
        assert.deepEqual(ids(session), ["a", "b", "c"]);

        await session.data.removeSource(key);
        assert.deepEqual(ids(session), ["a", "b"]);
        session.dispose();
    });

    it("still keeps them after a project save and open (issue #8083)", async () => {
        const { session, key } = await loaded();
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.deepEqual(ids(reopened), ["a", "b", "c"]);

        await reopened.data.removeSource(key);
        assert.deepEqual(ids(reopened), ["a", "b"]);
        session.dispose();
        reopened.dispose();
    });

    it("takes a node another load supplied once that load is gone", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id\na\n" }, name: "people.csv" });
        await session.data.import(
            { type: "csv", config: { data: "source,target\na,b\n" }, name: "links.csv" },
            { mode: "merge" },
        );
        const [people, links] = session.data.sources();

        await session.data.removeSource(people.key);
        assert.deepEqual(ids(session), ["a", "b"], "the links still name a");

        await session.data.removeSource(links.key);
        assert.deepEqual(ids(session), []);
        session.dispose();
    });
});
