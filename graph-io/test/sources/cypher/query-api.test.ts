/**
 * The Cypher source over Neo4j's Query API, against responses recorded from the public Neo4j demo
 * server (`scripts/live-cypher.ts --record`): the movies graph exactly, a user query, a
 * neighborhood, a query error with its line and column, a scalar result, probe and validate.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    credentials,
    expandFromSource,
    loadFromSource,
    probeSource,
    type Recording,
    replayFetch,
    SOURCE_DEGREE_ATTR,
    type SourceCursor,
    validateSource,
} from "../../../src/index.js";
import { neo4jSource } from "../../../src/sources/cypher/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const DEMO = "https://demo.neo4jlabs.com:7473";

/**
 * Recordings from a file under recordings/.
 * @param name - the file name, without extension
 * @returns the recordings
 */
function recorded(name: string): Recording[] {
    return JSON.parse(readFileSync(new URL(`recordings/${name}.json`, import.meta.url), "utf8")) as Recording[];
}

const PAGED = recorded("movies-paged");
const QUERIES = recorded("movies-queries");
const EXPAND_PAGED = recorded("movies-expand-paged");
const MOVIES = { database: "movies", mode: "all", pageSize: 100 } as const;

/** The count-store lookup a first page of Everything runs: the demo's 171 movies-graph nodes. */
const COUNT: Recording = {
    ...PAGED[0],
    requestBody: JSON.stringify({ statement: "MATCH (n) RETURN count(n) AS c", parameters: {}, accessMode: "Read" }),
    body: { data: { fields: ["c"], values: [[{ $type: "Integer", _value: "171" }]] }, bookmarks: [] },
};
const LOAD = [COUNT, ...PAGED];

/** A recorded Query API answer's rows. */
type Rows = { data: { fields: string[]; values: { _value: Record<string, string> }[][] } };

/**
 * The last key a recorded node page returned.
 * @param page - the page
 * @returns the key
 */
function lastKey(page: Recording): string {
    return ((page.body as Rows).data.values.at(-1)?.[1] as unknown as { _value: string })._value;
}

/**
 * The demo's answer to the relationships among the nodes a capped mode "all" loaded, built from
 * the recorded relationship pages: both ends at or before `last`, one past `after`.
 * @param last - the node page's last key
 * @param after - the previous page's last key, or null for the first page
 * @returns the recording
 */
function among(last: string, after: string | null): Recording {
    const values = PAGED.slice(2)
        .flatMap((r) => (r.body as Rows).data.values)
        .filter(([, r]) => {
            const ends = [r._value._start_node_element_id, r._value._end_node_element_id];
            return ends.every((id) => id <= last) && ends.some((id) => after === null || id > after);
        })
        .map(([a, r, b]) => [a, r, b]);
    const statement = [
        "MATCH (a)-[r]->(b) WITH a, r, b, elementId(a) AS ka, elementId(b) AS kb",
        `WHERE ka <= $last AND kb <= $last${after === null ? "" : " AND (ka > $after OR kb > $after)"}`,
        "RETURN a, r, b",
    ].join(" ");
    return {
        ...PAGED[2],
        requestBody: JSON.stringify({
            statement,
            parameters: { last, ...(after === null ? {} : { after }) },
            accessMode: "Read",
        }),
        body: { data: { fields: ["a", "r", "b"], values } },
    };
}

/** Mode "all" capped at 100 nodes, page by page: each node page, then the edges among what is loaded. */
const CAPPED = [COUNT, PAGED[0], among(lastKey(PAGED[0]), null), PAGED[1], among(lastKey(PAGED[1]), lastKey(PAGED[0]))];

/** Load options against recordings, with the demo's published login. */
function options(recordings: readonly Recording[]): Parameters<typeof loadFromSource>[2] {
    return { endpoint: DEMO, credential: credentials.basic("movies", "movies"), fetch: replayFetch(recordings) };
}

describe("cypher over the Query API (recorded from the Neo4j demo)", () => {
    it("loads the movies graph exactly: 171 nodes, 253 edges", async () => {
        const fetch = replayFetch(LOAD);
        const { snapshot, report, format } = await loadFromSource("neo4j", MOVIES, { ...options(LOAD), fetch });
        expect(format).toBe("source:neo4j");
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([171, 253]);
        expect(snapshot.directed).toBe(true);
        expect(report.source?.next).toBeNull();
        expect(report.source?.requests).toBe(6);
        expect(report.source?.total).toEqual({ nodes: 171 });
        expect(report.source?.server).toEqual({ product: "Neo4j", profile: "neo4j", readOnly: "enforced" });
        expect(report.source?.validators?.contentHash).toMatch(/^[0-9a-f]{64}$/);
        expect(fetch.calls.every((c) => c.method === "POST" && c.credential)).toBe(true);
        // keyset paging: the second page starts after the first page's last key, never with SKIP
        const bodies = PAGED.map((r) => JSON.parse(r.requestBody ?? "{}") as { statement: string; accessMode: string });
        expect(bodies.every((b) => b.accessMode === "Read" && !/\bSKIP\b/i.test(b.statement))).toBe(true);
        expect(bodies[1].statement).toContain("WHERE key > $after");
    });

    it("keeps labels, relationship types, properties and the degree hint", async () => {
        const { snapshot } = await loadFromSource("neo4j", MOVIES, options(LOAD));
        const keanu =
            Array.from({ length: snapshot.nodeCount }, (_, i) => i).find(
                (i) => snapshot.nodes.value("name", i) === "Keanu Reeves",
            ) ?? -1;
        expect(keanu).toBeGreaterThanOrEqual(0);
        expect(snapshot.nodes.value("labels", keanu)).toEqual(["Person"]);
        expect(snapshot.nodes.value("born", keanu)).toBe(1964);
        expect(snapshot.nodes.value(SOURCE_DEGREE_ATTR, keanu)).toBe(7);
        const types = new Set(Array.from({ length: snapshot.edgeCount }, (_, e) => snapshot.edges.value("type", e)));
        expect(types).toContain("ACTED_IN");
        expect(snapshot.edges.value("id", 0)).toMatch(/^5:/);
    });

    it("runs a user query as written, with its parameters sent separately", async () => {
        const fetch = replayFetch(QUERIES);
        const { snapshot } = await loadFromSource(
            "neo4j",
            {
                database: "movies",
                query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
                parameters: { name: "Tom Hanks" },
            },
            { ...options(QUERIES), fetch },
        );
        expect(snapshot.nodeCount).toBe(13);
        expect(snapshot.edgeCount).toBe(12);
    });

    it("loads a neighborhood and expands the same seeds", async () => {
        const keanu = "4:7bf987aa-a3d8-4759-97a2-84de2407046d:1";
        const params = { database: "movies", mode: "neighborhood", ids: [keanu], depth: 1 } as const;
        const near = await loadFromSource("neo4j", params, options(QUERIES));
        expect(near.snapshot.nodeCount).toBe(8);
        expect(near.snapshot.edgeCount).toBe(7);
        const { statement } = JSON.parse(QUERIES[2].requestBody ?? "{}") as { statement: string };
        expect(statement).toContain("-[*1..1]-");
        const expanded = await expandFromSource(
            neo4jSource,
            { params: { database: "movies" }, ids: [keanu], depth: 1 },
            options(QUERIES),
        );
        expect(expanded.snapshot.nodeCount).toBe(8);
    });

    it("pages a capped expansion by neighbor key, and its cursor continues where the last page stopped", async () => {
        const keanu = "4:7bf987aa-a3d8-4759-97a2-84de2407046d:1";
        const fetch = replayFetch(EXPAND_PAGED);
        const request = { params: { database: "movies" }, ids: [keanu], limit: 3 };
        const neighbors = new Set<string>();
        let cursor: SourceCursor | undefined;
        const pages: number[] = [];
        for (;;) {
            const page = await expandFromSource(neo4jSource, request, {
                ...options(EXPAND_PAGED),
                fetch,
                ...(cursor === undefined ? {} : { cursor }),
            });
            pages.push(page.snapshot.nodeCount - 1);
            for (const id of page.snapshot.ids) {
                if (id !== keanu) {
                    neighbors.add(String(id));
                }
            }
            cursor = page.report.source?.next ?? undefined;
            if (cursor === undefined) {
                break;
            }
        }
        // Keanu Reeves has 7 neighbors in the movies graph: 3, 3, then the last 1, none twice.
        expect(pages).toEqual([3, 3, 1]);
        expect(neighbors.size).toBe(7);
        const bodies = EXPAND_PAGED.map((r) => JSON.parse(r.requestBody ?? "{}") as { statement: string });
        expect(bodies[1].statement).toContain("WHERE key > $after");
    });

    it("sends a node cap on a user query to the server, and a full result continues with more rows", async () => {
        const query = "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p";
        const capped = (rows: number): string => `CALL {\n${query}\n}\nRETURN * LIMIT ${String(rows)}`;
        const [whole] = QUERIES;
        const body = whole.body as { data: { fields: string[]; values: unknown[][] } };
        const answer = (rows: number): Recording => ({
            ...whole,
            requestBody: JSON.stringify({
                statement: capped(rows),
                parameters: { name: "Tom Hanks" },
                accessMode: "Read",
            }),
            body: { ...body, data: { ...body.data, values: body.data.values.slice(0, rows) } },
        });
        const params = { database: "movies", query, parameters: { name: "Tom Hanks" } };
        const fetch = replayFetch([answer(3), answer(6)]);
        const first = await loadFromSource("neo4j", params, {
            ...options([]),
            fetch,
            limits: { maxNodes: 3 },
        });
        expect(first.snapshot.nodeCount).toBe(4); // Tom Hanks and three movies
        expect(first.report.source?.next).toMatchObject({ rows: 6 });
        const next = await loadFromSource("neo4j", params, {
            ...options([]),
            fetch,
            cursor: first.report.source?.next ?? undefined,
        });
        expect(next.snapshot.nodeCount).toBe(7);
        expect(fetch.calls).toHaveLength(2);
    });

    it("stops Everything at its node cap with the edges among the loaded nodes, and pages on by key", async () => {
        const fetch = replayFetch(CAPPED);
        const capped = await loadFromSource("neo4j", MOVIES, { ...options([]), fetch, limits: { maxNodes: 100 } });
        expect(capped.snapshot.nodeCount).toBe(100);
        expect(capped.snapshot.edgeCount).toBeGreaterThan(0);
        expect(capped.report.source?.next).toMatchObject({ phase: "nodes", after: lastKey(PAGED[0]) });

        const rest = await loadFromSource("neo4j", MOVIES, {
            ...options([]),
            fetch,
            limits: { maxNodes: 100 },
            cursor: capped.report.source?.next ?? undefined,
        });
        expect(rest.snapshot.nodeCount).toBeGreaterThanOrEqual(71);
        expect(rest.report.source?.next).toBeNull();
        expect(capped.snapshot.edgeCount + rest.snapshot.edgeCount).toBe(253);
    });

    it("runs a user query uncapped when the server refuses the cap's wrapper", async () => {
        const query = "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p";
        const refused = QUERIES.find((r) => (r.status ?? 200) >= 400);
        if (refused === undefined) {
            throw new Error("the recordings hold no refused query");
        }
        const fetch = replayFetch([
            {
                ...refused,
                requestBody: JSON.stringify({
                    statement: `CALL {\n${query}\n}\nRETURN * LIMIT 3`,
                    parameters: { name: "Tom Hanks" },
                    accessMode: "Read",
                }),
            },
            QUERIES[0],
        ]);
        const { snapshot, report } = await loadFromSource(
            "neo4j",
            { database: "movies", query, parameters: { name: "Tom Hanks" } },
            { ...options([]), fetch, limits: { maxNodes: 3 } },
        );
        expect(snapshot.nodeCount).toBe(13);
        expect(report.source?.next).toBeNull();
    });

    it("reports a query error with the line and column the server named", async () => {
        const err = await rejection(
            loadFromSource("neo4j", { database: "movies", query: "MATCH (n RETURN n" }, options(QUERIES)),
        );
        expect(err.issue?.code).toBe("E_SOURCE_QUERY");
        expect(err.issue?.params).toMatchObject({
            serverCode: "Neo.ClientError.Statement.SyntaxError",
            line: 1,
            column: 10,
        });
        expect(String(err.issue?.params?.serverMessage)).toContain("Invalid input");
    });

    it("refuses a result of scalars only with E_SOURCE_NOT_A_GRAPH", async () => {
        const err = await rejection(
            loadFromSource("neo4j", { database: "movies", query: "RETURN 1 AS one" }, options(QUERIES)),
        );
        expect(err.issue?.code).toBe("E_SOURCE_NOT_A_GRAPH");
        expect(err.issue?.params).toEqual({ columns: ["one"] });
    });

    it("probe reports the profile, version and read-only mode", async () => {
        const probe = await probeSource("neo4j", { database: "movies" }, options(QUERIES));
        expect(probe).toEqual({
            ok: true,
            server: { product: "Neo4j", profile: "neo4j", readOnly: "enforced", version: "2026.05.0" },
        });
    });

    it("validate re-runs the load and compares the content hash", async () => {
        const { report } = await loadFromSource("neo4j", MOVIES, options(LOAD));
        const seen = report.source?.validators ?? {};
        expect((await validateSource("neo4j", MOVIES, seen, options(LOAD))).status).toBe("current");
        expect((await validateSource("neo4j", MOVIES, { contentHash: "0".repeat(64) }, options(LOAD))).status).toBe(
            "changed",
        );
        expect((await validateSource("neo4j", MOVIES, {}, options(LOAD))).status).toBe("unverifiable");
    });

    it("maps a 401 to E_SOURCE_AUTH with the origin", async () => {
        const fetch = replayFetch([
            {
                method: "POST",
                url: `${DEMO}/db/movies/query/v2`,
                status: 401,
                headers: { "www-authenticate": 'Basic realm="Neo4j"' },
                body: { errors: [{ code: "Neo.ClientError.Security.Unauthorized", message: "Invalid credential." }] },
            },
        ]);
        const err = await rejection(
            loadFromSource("neo4j", { database: "movies", query: "RETURN 1" }, { ...options([]), fetch }),
        );
        expect(err.issue?.code).toBe("E_SOURCE_AUTH");
        expect(err.issue?.params).toMatchObject({ origin: DEMO, status: 401 });
    });

    it("maps a write refused in read mode to E_SOURCE_FORBIDDEN", async () => {
        const fetch = replayFetch([
            {
                method: "POST",
                url: `${DEMO}/db/movies/query/v2`,
                status: 400,
                body: {
                    errors: [
                        {
                            code: "Neo.ClientError.Statement.AccessMode",
                            message: "Writing in read access mode not allowed.",
                        },
                    ],
                },
            },
        ]);
        const err = await rejection(
            loadFromSource("neo4j", { database: "movies", query: "CREATE (n) RETURN n" }, { ...options([]), fetch }),
        );
        expect(err.issue?.code).toBe("E_SOURCE_FORBIDDEN");
    });
});

runSourceConformance(neo4jSource, [
    {
        name: "movies, paged",
        params: MOVIES,
        endpoint: DEMO,
        recordings: [...PAGED, ...CAPPED],
        cap: { maxNodes: 100 },
        credential: (secret) => credentials.basic("movies", secret),
    },
    {
        name: "a query error",
        params: { database: "movies", query: "MATCH (n RETURN n" },
        endpoint: DEMO,
        recordings: QUERIES,
    },
]);
