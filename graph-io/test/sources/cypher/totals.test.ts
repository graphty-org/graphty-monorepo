/**
 * The Cypher source's load totals (design/documents/sources.md, "Data model" rule 6): a mode "all"
 * load on Neo4j with at most one label and the server's ids counts its nodes in one count-store
 * lookup on its first page, and `report.source.total` carries it; every other load says nothing
 * unless `countFirst` asks. Against a fake Query API server, never a live database.
 */

import { describe, expect, it } from "vitest";

import { loadFromSource } from "../../../src/index.js";

const ENDPOINT = "https://db.example.com";

/** The genes the fake database holds. */
const GENES = 28_455;

/**
 * A fake Query API: a count answers `GENES` (or 9 for relationships), a node page answers the
 * genes after `$after` up to its LIMIT, everything else answers no rows.
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
            const c = statement.includes("count(r)") ? 9 : GENES;
            return reply(["c"], [[{ $type: "Integer", _value: String(c) }]]);
        }
        if (!statement.startsWith("MATCH (n)")) {
            return reply(["a", "r", "b"], []);
        }
        const limit = Number(/LIMIT (\d+)/.exec(statement)?.[1] ?? 0);
        const from = parameters.after === undefined ? 0 : Number(parameters.after.slice(1));
        const rows = Array.from({ length: Math.min(limit, GENES - from) }, (_, i) => {
            const key = `g${String(from + i + 1).padStart(5, "0")}`;
            return [
                { $type: "Node", _value: { _element_id: key, _labels: ["Gene"], _properties: {} } },
                { $type: "String", _value: key },
                { $type: "Integer", _value: "0" },
            ];
        });
        return reply(["n", "key", "degree"], rows);
    };
    return { fetch: f, asked };
}

/** The count statements a server was asked. */
const countsOf = (asked: readonly string[]): string[] => asked.filter((q) => q.includes("count("));

describe("cypher load totals", () => {
    it("src-41: one count-store lookup gives total.nodes for a one-label mode all load", async () => {
        const s = server();
        const first = await loadFromSource(
            "neo4j",
            { mode: "all", labels: ["Gene"] },
            { endpoint: ENDPOINT, fetch: s.fetch, limits: { maxNodes: 100 } },
        );
        expect(first.snapshot.nodeCount).toBe(100);
        expect(first.report.source?.total).toEqual({ nodes: GENES });
        expect(countsOf(s.asked)).toEqual(["MATCH (n:`Gene`) RETURN count(n) AS c"]);

        // a cursor resume never counts again
        const next = await loadFromSource(
            "neo4j",
            { mode: "all", labels: ["Gene"] },
            {
                endpoint: ENDPOINT,
                fetch: s.fetch,
                limits: { maxNodes: 100 },
                cursor: first.report.source?.next ?? undefined,
            },
        );
        expect(next.snapshot.nodeCount).toBe(100);
        expect(next.report.source?.total).toBeUndefined();
        expect(countsOf(s.asked)).toHaveLength(1);
    });

    it("src-42: the caller's own query sends no count and reports no total", async () => {
        const s = server();
        const { report } = await loadFromSource(
            "neo4j",
            { query: "MATCH (n:Gene) RETURN n" },
            { endpoint: ENDPOINT, fetch: s.fetch, limits: { maxNodes: 100 } },
        );
        expect(report.source?.total).toBeUndefined();
        expect(countsOf(s.asked)).toEqual([]);
    });

    it("counts nothing for two labels, an id property or Neptune, unless countFirst asks", async () => {
        for (const params of [
            { mode: "all", labels: ["Gene", "Protein"] },
            { mode: "all", labels: ["Gene"], idProperty: "symbol" },
            { mode: "all", labels: ["Gene"], profile: "neptune" },
        ]) {
            const s = server();
            const { report } = await loadFromSource("neo4j", params, {
                endpoint: ENDPOINT,
                fetch: s.fetch,
                limits: { maxNodes: 100 },
            });
            expect(report.source?.total, JSON.stringify(params)).toBeUndefined();
            expect(countsOf(s.asked)).toEqual([]);

            const counted = server();
            const asked = await loadFromSource(
                "neo4j",
                { ...params, countFirst: true },
                { endpoint: ENDPOINT, fetch: counted.fetch, limits: { maxNodes: 100 } },
            );
            expect(asked.report.source?.total).toEqual({ nodes: GENES, edges: 9 });
            expect(countsOf(counted.asked)).toHaveLength(2);
        }
    });

    it("counts nothing for a neighborhood", async () => {
        const s = server();
        const { report } = await loadFromSource(
            "neo4j",
            { mode: "neighborhood", ids: ["g00001"], labels: ["Gene"] },
            { endpoint: ENDPOINT, fetch: s.fetch },
        );
        expect(report.source?.total).toBeUndefined();
        expect(countsOf(s.asked)).toEqual([]);
    });
});
