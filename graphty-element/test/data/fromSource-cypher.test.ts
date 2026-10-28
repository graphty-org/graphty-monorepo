/**
 * A consumer with only graphty-element loads from graph-io's built-in Cypher source by naming it:
 * `DataSource.fromSource("neo4j")`, against responses recorded from the public Neo4j demo server
 * (graph-io's `scripts/live-cypher.ts --record`), gives the movies graph exactly.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { credentials, DataSource, replayFetch } from "../../extend";

const RECORDINGS = JSON.parse(
    readFileSync(
        new URL("../../../graph-io/test/sources/cypher/recordings/movies-paged.json", import.meta.url),
        "utf8",
    ),
) as Parameters<typeof replayFetch>[0];

/** The count-store lookup a first page of Everything runs: the demo's 171 nodes. */
const COUNT = {
    ...RECORDINGS[0],
    requestBody: JSON.stringify({ statement: "MATCH (n) RETURN count(n) AS c", parameters: {}, accessMode: "Read" }),
    body: { data: { fields: ["c"], values: [[{ $type: "Integer", _value: "171" }]] }, bookmarks: [] },
};

describe("DataSource.fromSource with the built-in neo4j source", () => {
    it("loads the demo movies graph: 171 nodes, 253 edges, labels and types kept", async () => {
        const Neo4j = DataSource.fromSource("neo4j");
        const reader = new Neo4j({
            database: "movies",
            mode: "all",
            pageSize: 100,
            endpoint: "https://demo.neo4jlabs.com:7473",
            credential: credentials.basic("movies", "movies"),
            fetch: replayFetch([COUNT, ...RECORDINGS]),
        });
        const nodes: Record<string, unknown>[] = [];
        const edges: Record<string, unknown>[] = [];
        for await (const chunk of reader.getData()) {
            nodes.push(...(chunk.nodes as unknown as Record<string, unknown>[]));
            edges.push(...(chunk.edges as unknown as Record<string, unknown>[]));
        }
        assert.strictEqual(nodes.length, 171);
        assert.strictEqual(edges.length, 253);
        const keanu = nodes.find((n) => n.name === "Keanu Reeves");
        assert.deepEqual(keanu?.labels, ["Person"]);
        assert.strictEqual(keanu?.["_source.degree"], 7);
        assert.isTrue(edges.some((e) => e.type === "ACTED_IN"));
    });
});
