/**
 * Injection safety of the Cypher source (design section 11): caller values travel as parameters
 * and are never spliced; identifiers are backtick-quoted with backticks doubled; depth and page
 * size are inlined only as checked integers.
 */

import { describe, expect, it } from "vitest";

import { credentials, loadFromSource, replayFetch } from "../../../src/index.js";
import { cypherIdentifier } from "../../../src/sources/cypher/index.js";
import { neo4jProfile, neptuneProfile } from "../../../src/sources/cypher/profiles.js";
import { edgePage, edgesAmong, neighborhood, nodePage } from "../../../src/sources/cypher/query-builder.js";
import { rejection } from "../helpers.js";

const ENDPOINT = "https://db.example.com";
const EMPTY = { data: { fields: ["n"], values: [] } };

/**
 * Load against a server that answers every statement with no rows, and return what was sent.
 * @param params - the params
 * @returns the statements and parameters sent
 */
async function sent(params: Record<string, unknown>): Promise<{ statement: string; parameters: unknown }[]> {
    const bodies: { statement: string; parameters: unknown }[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        bodies.push(JSON.parse(await request.text()) as { statement: string; parameters: unknown });
        return new Response(JSON.stringify(EMPTY), { headers: { "content-type": "application/json" } });
    };
    await loadFromSource("cypher", params, { endpoint: ENDPOINT, fetch });
    return bodies;
}

describe("cypherIdentifier", () => {
    it("wraps a name in backticks and doubles every backtick inside", () => {
        expect(cypherIdentifier("Person")).toBe("`Person`");
        expect(cypherIdentifier("odd`name")).toBe("`odd``name`");
        expect(cypherIdentifier("``")).toBe("``````");
    });

    it("refuses an empty name and one with a NUL", () => {
        for (const bad of ["", `a${String.fromCharCode(0)}b`]) {
            expect(() => cypherIdentifier(bad)).toThrow(
                expect.objectContaining({
                    issue: expect.objectContaining({
                        code: "E_SOURCE_PARAM",
                        params: { name: "identifier", reason: "identifier" },
                    }),
                }),
            );
        }
    });
});

describe("generated queries", () => {
    const filters = { labels: ["`Person`"], relationshipTypes: ["`KNOWS`", "`LIKES`"], idProperty: null };

    it("differ between servers only in the id expression", () => {
        expect(nodePage(neo4jProfile("5.26"), filters, "10", true, true)).toBe(
            "MATCH (n) WHERE (n:`Person`) WITH n, elementId(n) AS key WHERE key > $after RETURN n, key, size([(n)--() | 1]) AS degree ORDER BY key LIMIT 10",
        );
        expect(nodePage(neo4jProfile("3.5.12"), filters, "10", false, false)).toBe(
            "MATCH (n) WHERE (n:`Person`) WITH n, id(n) AS key RETURN n, key ORDER BY key LIMIT 10",
        );
        expect(edgePage(neptuneProfile(), filters, "5", false)).toBe(
            "MATCH (a)-[r:`KNOWS`|`LIKES`]->(b) WHERE (a:`Person`) AND (b:`Person`) WITH a, r, b, id(r) AS key RETURN a, r, b, key ORDER BY key LIMIT 5",
        );
    });

    it("follow the direction asked and key on the id property when given", () => {
        const byUuid = { ...filters, idProperty: "`uuid`" };
        const out = neighborhood(neo4jProfile(null), byUuid, { depth: "2", direction: "out", limit: "50" }, false);
        expect(out).toBe(
            "MATCH (s) WHERE s.`uuid` IN $ids OPTIONAL MATCH p = (s)-[:`KNOWS`|`LIKES`*1..2]->(x) WHERE (x:`Person`) AND x.`uuid` IS NOT NULL WITH s, p, x.`uuid` AS key WITH s, p, key ORDER BY key LIMIT 50 RETURN s, p, key",
        );
        // A capped expansion's next page starts after the last neighbor key it returned.
        expect(
            neighborhood(
                neo4jProfile(null),
                byUuid,
                { depth: "1", direction: "both", limit: "50", after: true },
                false,
            ),
        ).toContain("WITH s, p, x.`uuid` AS key WHERE key > $after WITH s, p, key ORDER BY key LIMIT 50");
        expect(neighborhood(neo4jProfile(null), byUuid, { depth: "1", direction: "in", limit: null }, false)).toContain(
            "<-[:`KNOWS`|`LIKES`*1..1]-",
        );
    });
});

describe("injection", () => {
    const attack = "x` RETURN 1 UNION MATCH (m) DETACH DELETE m //";

    it("quotes a hostile label, relationship type and id property so it stays one identifier", async () => {
        const [first] = await sent({ mode: "all", labels: [attack], relationshipTypes: [attack], idProperty: attack });
        const quotedAttack = "`x`` RETURN 1 UNION MATCH (m) DETACH DELETE m //`";
        expect(first.statement).toContain(`n:${quotedAttack}`);
        expect(first.statement).toContain(`n.${quotedAttack} IS NOT NULL`);
        // with every quoted identifier removed, nothing of the attack is left in the statement
        expect(first.statement.replace(/`(?:[^`]|``)*`/g, "ID")).not.toMatch(/DELETE|UNION/);
    });

    it("sends seed ids and user parameters as parameters, never in the statement", async () => {
        const ids = ["') DETACH DELETE n //", "x"];
        const [first] = await sent({ mode: "neighborhood", ids });
        expect(first.statement).not.toContain("DETACH");
        expect(first.parameters).toEqual({ ids });
        const [user] = await sent({ query: "MATCH (n {name: $name}) RETURN n", parameters: { name: "'; DROP" } });
        expect(user).toEqual({
            statement: "MATCH (n {name: $name}) RETURN n",
            parameters: { name: "'; DROP" },
            accessMode: "Read",
        });
    });

    it("inlines depth only as an integer from 1 to 10", async () => {
        for (const depth of [0, 11, 1.5]) {
            const err = await rejection(
                loadFromSource(
                    "cypher",
                    { mode: "neighborhood", ids: ["a"], depth },
                    { endpoint: ENDPOINT, fetch: replayFetch([]) },
                ),
            );
            expect(err.issue?.code).toBe("E_SOURCE_PARAM");
            expect(err.issue?.params?.name).toBe("depth");
        }
        const err = await rejection(
            loadFromSource(
                "cypher",
                { mode: "neighborhood", ids: ["a"], depth: "1]-() DETACH DELETE n //" },
                { endpoint: ENDPOINT, fetch: replayFetch([]) },
            ),
        );
        expect(err.issue?.params).toEqual({ name: "depth", reason: "type" });
    });

    it("refuses an empty identifier before any request", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(
            loadFromSource("cypher", { mode: "all", labels: [""] }, { endpoint: ENDPOINT, fetch }),
        );
        expect(err.issue?.params).toEqual({ name: "labels", reason: "identifier" });
        expect(fetch.calls).toHaveLength(0);
    });

    it("refuses modes without what they need", async () => {
        const options = { endpoint: ENDPOINT, fetch: replayFetch([]), credential: credentials.bearer("t") };
        expect((await rejection(loadFromSource("cypher", { mode: "query" }, options))).issue?.params).toEqual({
            name: "query",
            reason: "required",
        });
        expect((await rejection(loadFromSource("cypher", { mode: "neighborhood" }, options))).issue?.params).toEqual({
            name: "ids",
            reason: "required",
        });
    });
});

describe("edgesAmong", () => {
    it("starts every match from the node page's own keys, never from every relationship", () => {
        const filters = { labels: ["`Gene`"], idProperty: null, relationshipTypes: [] };
        const statement = edgesAmong(neo4jProfile("5.24.0"), filters);
        const branches = statement.split(" UNION ALL ");
        expect(branches).toHaveLength(2);
        for (const branch of branches) {
            // each branch anchors one end on $keys before anything else is read
            expect(branch).toMatch(/^MATCH \(a\)-\[r\]->\(b\) WHERE (?:elementId|id)\([ab]\) IN \$keys AND /);
            expect(branch).toContain("(a:`Gene`)");
            expect(branch).toContain("(b:`Gene`)");
        }
        // a relationship with both ends on the page arrives once
        expect(branches[1]).toMatch(/NOT (elementId|id)\(a\) IN \$keys/);
    });
});
