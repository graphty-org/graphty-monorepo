/**
 * @file Which load supplied each node and edge: `data.sourcesOf`, the `source` rule leaf,
 * `data.removeSource`, the counts and keys `data.sources()` lists, and `AttributeDescriptor.sources`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/** Ava, Ben and Cara, three friendships, and an age for each. */
const FRIENDS = "source,target,since\nAva,Ben,2001\nBen,Cara,2002\nCara,Ava,2003\n";
/** Ava again, Dan and Eve, and a second Ava-Ben edge (CSV keeps repeated edges), with a channel each. */
const MESSAGES = "source,target,channel\nAva,Dan,mail\nDan,Eve,chat\nAva,Ben,chat\n";

/**
 * A session holding both files, FRIENDS first.
 * @returns the session
 */
async function both(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: FRIENDS }, name: "friends.csv" });
    await session.data.import({ type: "csv", config: { data: MESSAGES }, name: "messages.csv" }, { mode: "merge" });
    return session;
}

/**
 * The edge between two nodes.
 * @param session - the session
 * @param source - one end
 * @param target - the other
 * @returns its id
 */
function edgeBetween(session: GraphSession, source: string, target: string): string {
    const edge = session.data.edges().find((each) => each.source === source && each.target === target);
    assert.isDefined(edge, `an edge ${source}-${target}`);
    return edge.id;
}

/**
 * How many nodes and edges are visible.
 * @param session - the session
 * @returns nodes, edges
 */
function shown(session: GraphSession): [number, number] {
    const { visibleNodes, visibleEdges } = session.visibility.summary;
    return [visibleNodes, visibleEdges];
}

describe("source provenance", () => {
    it("says which loads supplied each node and edge when two files share ids", async () => {
        const session = await both();
        const [friends, messages] = session.data.sources();
        assert.deepStrictEqual(
            session.data.sources().map((each) => [each.key, each.kind, each.name, each.counts]),
            [
                ["s1", "file", "friends.csv", { nodes: 3, edges: 3 }],
                ["s2", "file", "messages.csv", { nodes: 4, edges: 3 }],
            ],
        );

        assert.deepStrictEqual(session.data.sourcesOf("Ava"), [friends.key, messages.key]);
        assert.deepStrictEqual(session.data.sourcesOf("Ben"), [friends.key, messages.key]);
        assert.deepStrictEqual(session.data.sourcesOf("Cara"), [friends.key]);
        assert.deepStrictEqual(session.data.sourcesOf("Eve"), [messages.key]);
        assert.deepStrictEqual(session.data.sourcesOf(edgeBetween(session, "Ben", "Cara"), { kind: "edge" }), [
            friends.key,
        ]);
        assert.deepStrictEqual(session.data.sourcesOf(edgeBetween(session, "Dan", "Eve"), { kind: "edge" }), [
            messages.key,
        ]);
        assert.deepStrictEqual(session.data.sourcesOf("nobody"), []);
        session.dispose();
    });

    it("names the loads whose rows carry each column", async () => {
        const session = await both();
        const fed = (name: string): unknown => session.data.attributes().find((each) => each.name === name)?.sources;
        assert.deepStrictEqual(fed("since"), ["s1"]);
        assert.deepStrictEqual(fed("channel"), ["s2"]);
        session.dispose();
    });

    it("counts one load's nodes and edges with a source rule", async () => {
        const session = await both();
        await session.visibility.set({ kind: "source", sources: ["s1"] });
        assert.deepStrictEqual(shown(session), [3, 3]);
        await session.visibility.set({ kind: "source", sources: ["s2"] });
        assert.deepStrictEqual(shown(session), [4, 3]);
        await session.visibility.set({ kind: "not", of: { kind: "source", sources: ["s2"] } });
        // Cara alone: the edges only friends.csv has all end at Ava or Ben, who are hidden.
        assert.deepStrictEqual(shown(session), [1, 0]);
        session.dispose();
    });

    it("resolves a source rule as a scope, as a style layer's target reads it", async () => {
        const session = await both();
        const resolved = await session.scope.resolve({
            define: { kind: "rule", where: { kind: "source", sources: ["s2"] }, reading: "clipped" },
        });
        assert.deepStrictEqual([resolved.nodeCount, resolved.edgeCount], [4, 3]);
        session.dispose();
    });

    it("removes one load as one undo step, keeping what the other also supplied", async () => {
        const session = await both();
        const before = session.history.steps.length;
        const result = await session.data.removeSource("s2");

        assert.deepStrictEqual(result, { removed: { nodes: 2, edges: 3 }, kept: { nodes: 2, edges: 0 } });
        assert.sameMembers(
            session.data.nodes().map((each) => each.id),
            ["Ava", "Ben", "Cara"],
        );
        assert.strictEqual(session.data.edges().length, 3);
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.key),
            ["s1"],
        );
        assert.deepStrictEqual(session.data.sourcesOf("Ava"), ["s1"]);
        assert.strictEqual(session.data.source()?.name, "friends.csv");
        assert.strictEqual(session.history.steps.length, before + 1, "one step");

        await session.undo();
        assert.strictEqual(session.data.nodes().length, 5);
        assert.deepStrictEqual(session.data.sourcesOf("Ava"), ["s1", "s2"]);
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.key),
            ["s1", "s2"],
        );
        session.dispose();
    });

    it("keeps an edge both loads supplied when one is removed", async () => {
        const session = createGraphSession();
        // Folded into one edge: the second file's Ava-Ben is the first file's.
        await session.config.set({ data: { knownFields: { repeatedEdges: "first" } } });
        await session.data.import({ type: "csv", config: { data: FRIENDS }, name: "friends.csv" });
        await session.data.import({ type: "csv", config: { data: MESSAGES }, name: "messages.csv" }, { mode: "merge" });
        const shared = edgeBetween(session, "Ava", "Ben");
        assert.deepStrictEqual(session.data.sourcesOf(shared, { kind: "edge" }), ["s1", "s2"]);

        const result = await session.data.removeSource("s1");
        assert.deepStrictEqual(result, { removed: { nodes: 1, edges: 2 }, kept: { nodes: 2, edges: 1 } });
        assert.deepStrictEqual(session.data.sourcesOf(shared, { kind: "edge" }), ["s2"]);
        assert.isUndefined(session.data.node("Cara"));
        session.dispose();
    });

    it("refuses a key no load has", async () => {
        const session = await both();
        await session.data.removeSource("s9").then(
            () => assert.fail("expected a refusal"),
            (error: unknown) => {
                assert.propertyVal(error, "code", "E_LOAD_UNKNOWN");
            },
        );
        session.dispose();
    });

    it("keeps each load's key through undo and redo, and never hands one out twice", async () => {
        const session = await both();
        await session.undo();
        await session.redo();
        assert.deepStrictEqual(session.data.sourcesOf("Eve"), ["s2"]);
        await session.data.import({ type: "csv", config: { data: FRIENDS }, name: "again.csv" });
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.key),
            ["s3"],
        );
        session.dispose();
    });

    it("keeps what each load supplied through a project save and reopen", async () => {
        const session = await both();
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });

        assert.deepStrictEqual(reopened.data.sourcesOf("Ava"), ["s1", "s2"]);
        assert.deepStrictEqual(reopened.data.sourcesOf(edgeBetween(reopened, "Dan", "Eve"), { kind: "edge" }), ["s2"]);
        assert.deepStrictEqual(
            reopened.data.sources().map((each) => each.counts),
            session.data.sources().map((each) => each.counts),
        );
        session.dispose();
        reopened.dispose();
    });

    it("calls a generated graph a sample", async () => {
        const session = createGraphSession();
        await session.data.generate("path", { n: 3 });
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.kind),
            ["sample"],
        );
        session.dispose();
    });
});
