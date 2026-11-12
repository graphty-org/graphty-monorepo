/**
 * The Cypher source's smaller rules: expansion checks, the transport an endpoint picks, the count
 * that gives progress a total, a missing Query API, and the degree hint dropped when a server
 * refuses it.
 */

import { describe, expect, it } from "vitest";

import { expandFromSource, loadFromSource } from "../../../src/index.js";
import { rejection } from "../helpers.js";

const ENDPOINT = "https://db.example.com";

/** One Query API answer. */
type Answer = { status?: number; body: unknown };

/**
 * A fetch that answers each statement through a function, and records what was asked.
 * @param answer - the answer to a statement
 * @returns the fetch and the statements
 */
function server(answer: (statement: string) => Answer): { fetch: typeof fetch; asked: string[]; urls: string[] } {
    const asked: string[] = [];
    const urls: string[] = [];
    const f: typeof fetch = async (input, init) => {
        const request = new Request(input, init);
        urls.push(request.url);
        const text = await request.text();
        const statement = text.startsWith("{")
            ? ((JSON.parse(text) as { statement?: string; query?: string }).statement ?? "")
            : (new URLSearchParams(text).get("query") ?? "");
        asked.push(statement);
        const { status = 200, body } = answer(statement);
        return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    };
    return { fetch: f, asked, urls };
}

const EMPTY: Answer = { body: { data: { fields: ["n"], values: [] } } };
const count = (c: number): Answer => ({
    body: { data: { fields: ["c"], values: [[{ $type: "Integer", _value: String(c) }]] } },
});

describe("cypher options", () => {
    it("checks an expansion's ids, direction and depth before any request", async () => {
        const s = server(() => EMPTY);
        const expand = (request: Record<string, unknown>): Promise<unknown> =>
            expandFromSource("cypher", { params: {}, ids: ["a"], ...request }, { endpoint: ENDPOINT, fetch: s.fetch });
        expect((await rejection(expand({ ids: [] }))).issue?.params).toEqual({ name: "ids", reason: "required" });
        expect((await rejection(expand({ direction: "up" }))).issue?.params).toEqual({
            name: "direction",
            reason: "enum",
        });
        expect((await rejection(expand({ depth: 11 }))).issue?.params).toEqual({ name: "depth", reason: "range" });
        expect(s.asked).toHaveLength(0);
        await expand({ direction: "in", relationshipTypes: ["KNOWS"], limit: 5 });
        expect(s.asked[0]).toContain("<-[:`KNOWS`*1..1]-");
        expect(s.asked[0]).toContain("LIMIT 5");
    });

    it("counts first for a progress total", async () => {
        const counts: Record<string, Answer> = { "count(n)": count(3), "count(r)": count(2) };
        const s = server((q) => Object.entries(counts).find(([k]) => q.includes(k))?.[1] ?? EMPTY);
        const totals: (number | undefined)[] = [];
        await loadFromSource(
            "cypher",
            { mode: "all", countFirst: true },
            { endpoint: ENDPOINT, fetch: s.fetch, onProgress: (_done, total) => totals.push(total) },
        );
        expect(totals).toContain(5);
    });

    it("drops the degree hint once when the server refuses it", async () => {
        const s = server((q) =>
            q.includes("size([(")
                ? {
                      status: 400,
                      body: {
                          errors: [
                              { code: "Neo.ClientError.Statement.SyntaxError", message: "no pattern comprehension" },
                          ],
                      },
                  }
                : EMPTY,
        );
        await loadFromSource("cypher", { mode: "all" }, { endpoint: ENDPOINT, fetch: s.fetch });
        expect(s.asked.filter((q) => q.includes("size(["))).toHaveLength(1);
        expect(s.asked.at(-1)).toContain("MATCH (a)-[r]->(b)");
    });

    it("answers E_SOURCE_NOT_FOUND where there is no Query API", async () => {
        const s = server(() => ({ status: 404, body: "not here" }));
        const err = await rejection(
            loadFromSource("neo4j", { query: "RETURN 1" }, { endpoint: ENDPOINT, fetch: s.fetch }),
        );
        expect(err.issue?.params).toEqual({ origin: ENDPOINT, what: "url", value: `${ENDPOINT}/db/neo4j/query/v2` });
    });

    it("names a missing database", async () => {
        const s = server(() => ({
            status: 404,
            body: {
                errors: [{ code: "Neo.ClientError.Database.DatabaseNotFound", message: "Database does not exist" }],
            },
        }));
        const err = await rejection(
            loadFromSource("neo4j", { query: "RETURN 1", database: "nope" }, { endpoint: ENDPOINT, fetch: s.fetch }),
        );
        expect(err.issue?.params).toEqual({ origin: ENDPOINT, what: "database", value: "nope" });
    });

    it("picks the transport from the endpoint", async () => {
        const s = server(() => ({ body: { results: [] } }));
        await loadFromSource(
            "cypher",
            { query: "RETURN 1", transport: "neptune-https" },
            { endpoint: ENDPOINT, fetch: s.fetch },
        );
        await loadFromSource(
            "neptune",
            { query: "RETURN 1" },
            { endpoint: "https://g-1.us-east-1.neptune-graph.amazonaws.com", fetch: s.fetch },
        );
        expect(s.urls).toEqual([`${ENDPOINT}/openCypher`, "https://g-1.us-east-1.neptune-graph.amazonaws.com/queries"]);
    });
});
