/**
 * The built-in NDEx and Neo4j sources, replayed from recorded responses, through
 * `session.data.import`: one `data.import-source` step, and undo and redo with no extra fetch.
 *
 * graph-io's sources are implemented, so any rejection (E_SOURCE_UNSUPPORTED included) fails the test.
 */

import { assert, describe, it } from "vitest";

// What query.wikidata.org answered on 2026-10-20 (graph-io's scripts/record-sparql.ts)
import { WIKIDATA_ADVISORS, WIKIDATA_ENDPOINT } from "../../../../graph-io/test/sources/sparql/advisors";
import wikidataRecordings from "../../../../graph-io/test/sources/sparql/recordings/wikidata-advisors.json";
import { createGraphSession, credentials, type GraphtyError, replayFetch } from "../../../session";
import ndexRecordings from "../../../stories/fixtures/sources/ndex-wp5483.json";
import neo4jRecordings from "../../../stories/fixtures/sources/neo4j-movies.json";
import openalexRecordings from "../../../stories/fixtures/sources/openalex-citing.json";

/**
 * Load, undo and redo, counting fetches.
 * @param input - the source and its params
 * @param options - the endpoint and the credential
 * @param recordings - what the service answered
 * @returns the node and edge counts, and the fetches made
 */
async function loadUndoRedo(
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
    it("loads NDEx WikiPathways WP5483", async () => {
        const { nodes, edges } = await loadUndoRedo(
            { source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" } },
            {},
            ndexRecordings,
        );
        assert.strictEqual(nodes, 57);
        assert.strictEqual(edges, 34);
    });

    it("loads Tom Hanks's films from the Neo4j demo's movies database", async () => {
        const { nodes, edges } = await loadUndoRedo(
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

    it("loads a Wikidata CONSTRUCT through sparql: Load more adds a page, expanding a node adds its triples", async () => {
        const session = createGraphSession();
        try {
            const fetch = replayFetch(wikidataRecordings);
            await session.data.import(
                { source: "sparql", config: WIKIDATA_ADVISORS },
                { endpoint: WIKIDATA_ENDPOINT, fetch, limits: { maxNodes: 150 } },
            );
            const first = session.data.nodes().length;
            assert.strictEqual(first, 281);
            assert.isNotNull(session.data.loads()[0].next);

            await session.data.more({ fetch });
            assert.isAbove(session.data.nodes().length, first);
            assert.isNull(session.data.loads()[0].next);

            const seed = "http://www.wikidata.org/entity/Q127944";
            const edges = session.data.edges().length;
            await session.data.expand([seed], { limit: 40, fetch });
            assert.isAbove(session.data.edges().length, edges);
            assert.strictEqual(fetch.calls.length, 5);
        } finally {
            session.dispose();
        }
    });

    it("loads the OpenAlex example's first page, and its source entry offers Load more", async () => {
        const session = createGraphSession();
        try {
            // The recorded citing page, with the cursor a live answer carries to its next page.
            const paged = openalexRecordings.map((r, at) =>
                at === 1
                    ? {
                          ...r,
                          body: {
                              ...r.body,
                              meta: { ...r.body.meta, ...Object.fromEntries([["next_cursor", "next"]]) },
                          },
                      }
                    : r,
            );
            const fetch = replayFetch(paged);
            await session.data.loadExample("openalex", "openalex-watts-strogatz", { fetch });
            assert.isNotNull(session.data.loads()[0].next, "the example stops after its first page");
            const [entry] = session.data.sources();
            assert.deepEqual(entry.features, { expand: true, more: true, refresh: true });
            assert.strictEqual(fetch.calls.length, 2);
        } finally {
            session.dispose();
        }
    });
});
