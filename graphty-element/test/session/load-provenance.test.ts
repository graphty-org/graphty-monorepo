/**
 * @file What a load records about itself at ingest: the nodes it found already in the graph, which
 * removing it leaves (issue #7708), and what its file recorded under `meta.extra`, which an export
 * writes again (issue #7600).
 */

import "../../src/data/index";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { exportSession } from "../../src/data/export";

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

describe("removing a plain load", () => {
    it("keeps the nodes addNodes made, and takes the ends the load made", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.import(
            { type: "csv", config: { data: "source,target\na,b\nb,c\n" }, name: "links.csv" },
            { mode: "merge" },
        );
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 2);
        const [load] = session.data.sources();

        await session.data.removeSource(load.key);
        assert.deepEqual(ids(session), ["a", "b"]);
        assert.lengthOf(session.data.edges(), 0);

        await session.undo();
        assert.deepEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 2);
        session.dispose();
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

describe("exporting a loaded file", () => {
    it("writes a strict DOT graph as strict", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "dot", config: { data: "strict digraph { a -> b }" } });

        const text = await exportSession(session, "dot").text();
        assert.match(text, /^strict digraph/);
        session.dispose();
    });
});
