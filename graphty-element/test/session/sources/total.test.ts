/**
 * @file A network load's total (design/documents/sources.md, "Data model" rule 6): what the source
 * counted for the load reaches `data.sources()` and the saved `graphty-sources` entry, so an
 * application can show "100 of 28,455". Against a fake Neo4j Query API, never a live database.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";

const ENDPOINT = "https://db.example.com";

/** The Query API's name for a node's element id. */
const ELEMENT_ID = "_element_id";

/** The genes the fake database holds. */
const GENES = 28_455;

/**
 * A fake Query API: a count answers `GENES`, a node page the genes after `$after` up to its LIMIT,
 * everything else no rows.
 * @returns the fetch and the statements it was asked
 */
function server(): { fetch: typeof fetch; asked: string[] } {
    const asked: string[] = [];
    const f: typeof fetch = async (input, init) => {
        const request = new Request(input, init);
        const { statement, parameters } = (await request.json()) as {
            statement: string;
            parameters: { after?: string };
        };
        asked.push(statement);
        const reply = (fields: string[], values: unknown[][]): Response => Response.json({ data: { fields, values } });
        if (statement.includes("count(")) {
            return reply(["c"], [[{ $type: "Integer", _value: String(GENES) }]]);
        }

        // a node page, or the caller's own query wrapped in its cap
        if (!statement.startsWith("MATCH (n)") && !statement.startsWith("CALL")) {
            return reply(["n"], []);
        }

        const limit = Number(/LIMIT (\d+)/.exec(statement)?.[1] ?? 0);
        const from = parameters.after === undefined ? 0 : Number(parameters.after.slice(1));
        const rows = Array.from({ length: Math.min(limit, GENES - from) }, (_, i) => {
            const key = `g${String(from + i + 1).padStart(5, "0")}`;
            return [
                { $type: "Node", _value: { [ELEMENT_ID]: key, _labels: ["Gene"], _properties: {} } },
                { $type: "String", _value: key },
            ];
        });
        return reply(["n", "key"], rows);
    };
    return { fetch: f, asked };
}

/** The count statements a server was asked. */
const countsOf = (asked: readonly string[]): string[] => asked.filter((q) => q.includes("count("));

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session that loaded from the fake server.
 * @param config - the Cypher params
 * @returns the session and the server
 */
async function loaded(config: Record<string, unknown>): Promise<{ session: GraphSession; asked: string[] }> {
    const session = createGraphSession();
    sessions.push(session);
    const { fetch, asked } = server();
    await session.data.import({ source: "neo4j", config }, { endpoint: ENDPOINT, fetch, limits: { maxNodes: 100 } });
    return { session, asked };
}

describe("a network load's total", () => {
    it("src-41: a one-label mode all load lists and saves the source's count, kept by data.more", async () => {
        const session = createGraphSession();
        sessions.push(session);
        const { fetch, asked } = server();
        await session.data.import(
            { source: "neo4j", config: { mode: "all", labels: ["Gene"] } },
            { endpoint: ENDPOINT, fetch, limits: { maxNodes: 100 } },
        );
        assert.strictEqual(session.data.nodes().length, 100);
        assert.strictEqual(session.data.sources()[0].total, GENES);
        assert.lengthOf(countsOf(asked), 1);

        await session.data.more({ fetch });
        assert.strictEqual(session.data.nodes().length, 200);
        assert.lengthOf(countsOf(asked), 1, "data.more never counts again");
        assert.strictEqual(session.data.sources()[0].total, GENES);

        const { text } = await session.project.save();
        const doc = JSON.parse(text) as { members: { kind: string; loads?: { total?: unknown }[] }[] };
        const member = doc.members.find((each) => each.kind === "graphty-sources");
        assert.deepEqual(member?.loads?.[0].total, { nodes: GENES });
    });

    it("src-42: the caller's own query, capped, counts nothing and lists no total", async () => {
        const { session, asked } = await loaded({ query: "MATCH (n:Gene) RETURN n" });
        assert.lengthOf(countsOf(asked), 0);
        assert.isUndefined(session.data.sources()[0].total);
    });

    it("src-42: the caller's own query read whole lists what it read, and counts nothing", async () => {
        const session = createGraphSession();
        sessions.push(session);
        const { fetch, asked } = server();
        await session.data.import(
            { source: "neo4j", config: { query: "MATCH (n) RETURN n LIMIT 3" } },
            { endpoint: ENDPOINT, fetch },
        );
        assert.lengthOf(countsOf(asked), 0);
        assert.strictEqual(session.data.sources()[0].total, 3);
    });

    it("two labels count nothing unless countFirst asks", async () => {
        const plain = await loaded({ mode: "all", labels: ["Gene", "Protein"] });
        assert.lengthOf(countsOf(plain.asked), 0);
        assert.isUndefined(plain.session.data.sources()[0].total);

        const counted = await loaded({ mode: "all", labels: ["Gene", "Protein"], countFirst: true });
        assert.strictEqual(counted.session.data.sources()[0].total, GENES);
    });
});
