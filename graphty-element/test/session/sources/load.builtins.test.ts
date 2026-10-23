/**
 * The built-in NDEx and Neo4j sources, replayed from recorded responses, through
 * `session.data.import`: one `data.import-source` step, and undo and redo with no extra fetch.
 *
 * Each test skips itself while graph-io's source of that id is still a stub (it rejects with
 * E_SOURCE_UNSUPPORTED, `feature: "read"`), so it starts checking the moment the source lands.
 */

import { assert, describe, it, type TestContext } from "vitest";

import { createGraphSession, credentials, type GraphtyError, replayFetch } from "../../../session";
import ndexRecordings from "../../../stories/fixtures/sources/ndex-wp5483.json";
import neo4jRecordings from "../../../stories/fixtures/sources/neo4j-movies.json";

/**
 * Load, undo and redo, counting fetches; skip while the source is a stub.
 * @param ctx - the test's context
 * @param input - the source and its params
 * @param options - the endpoint and the credential
 * @param recordings - what the service answered
 * @returns the node and edge counts, and the fetches made
 */
async function loadUndoRedo(
    ctx: TestContext,
    input: { source: string; config: Record<string, unknown> },
    options: Record<string, unknown>,
    recordings: Parameters<typeof replayFetch>[0],
): Promise<{ nodes: number; edges: number; calls: number }> {
    const session = createGraphSession();
    try {
        const fetch = replayFetch(recordings);
        const error = await session.data.import(input, { ...options, fetch }).then(
            () => null,
            (e: unknown) => e as GraphtyError,
        );
        if (error?.code === "E_SOURCE_UNSUPPORTED" && error.details.feature === "read") {
            ctx.skip(`graph-io's ${input.source} source is not built yet`);
        }

        assert.isNull(error);
        assert.strictEqual(session.history.steps[0].fact.code, "data.import-source");
        const calls = fetch.calls.length;
        const nodes = session.data.nodes().length;
        await session.undo();
        assert.strictEqual(session.data.nodes().length, 0);
        await session.redo();
        assert.strictEqual(session.data.nodes().length, nodes);
        assert.strictEqual(fetch.calls.length, calls, "undo and redo never fetch");
        return { nodes, edges: session.data.edges().length, calls };
    } finally {
        session.dispose();
    }
}

describe("built-in sources from recorded responses", () => {
    it("loads NDEx WikiPathways WP5483", async (ctx) => {
        const { nodes, edges } = await loadUndoRedo(
            ctx,
            { source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" } },
            {},
            ndexRecordings,
        );
        assert.strictEqual(nodes, 57);
        assert.strictEqual(edges, 34);
    });

    it("loads Tom Hanks's films from the Neo4j demo's movies database", async (ctx) => {
        const { nodes, edges } = await loadUndoRedo(
            ctx,
            {
                source: "neo4j",
                config: {
                    query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
                    parameters: { name: "Tom Hanks" },
                    database: "movies",
                },
            },
            { endpoint: "https://demo.neo4jlabs.com:7473", credential: credentials.basic("movies", "movies") },
            neo4jRecordings,
        );
        assert.isAbove(nodes, 1);
        assert.strictEqual(edges, nodes - 1, "one ACTED_IN edge per film");
    });
});
