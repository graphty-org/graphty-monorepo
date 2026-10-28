/**
 * The `neptune` preset over hand-written responses in the shapes AWS documents (no public Neptune
 * exists to record from): Neptune Database's `POST /openCypher` and Neptune Analytics' `POST
 * /queries`, the `~id` node and relationship shapes, a query error with its position, an error
 * appended to a 200 body, `GET /status` for probe, and the refusal in a browser.
 */

import { describe, expect, it } from "vitest";

import { credentials, loadFromSource, probeSource, type Recording, replayFetch } from "../../../src/index.js";
import { neptuneSource } from "../../../src/sources/cypher/index.js";
import { nodeOnly } from "../../../src/sources/cypher/transports/neptune-https.js";
import { runSourceConformance } from "../harness.js";
import { bareContext, rejection } from "../helpers.js";

const DB = "https://db.cluster-x.us-east-1.neptune.amazonaws.com:8182";
const GRAPH = "https://g-abc123.us-east-1.neptune-graph.amazonaws.com";
const AWS = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "secret", sessionToken: "token" };

const SEA = { "~id": "22", "~entityType": "node", "~labels": ["airport"], "~properties": { code: "SEA", runways: 4 } };
const ANC = { "~id": "151", "~entityType": "node", "~labels": ["airport"], "~properties": { code: "ANC" } };
const ROUTE = {
    "~id": "7389",
    "~entityType": "relationship",
    "~start": "22",
    "~end": "151",
    "~type": "route",
    "~properties": { dist: 1449 },
};

/**
 * One recorded openCypher exchange.
 * @param statement - the query sent
 * @param body - the answer
 * @param status - the status
 * @param parameters - the parameters sent
 * @returns the recording
 */
function cypherCall(statement: string, body: unknown, status = 200, parameters: unknown = {}): Recording {
    return {
        method: "POST",
        url: `${DB}/openCypher`,
        requestBody: new URLSearchParams({ query: statement, parameters: JSON.stringify(parameters) }).toString(),
        status,
        body,
    };
}

const NODE_PAGE = "MATCH (n) WITH n, id(n) AS key RETURN n, key, size([(n)--() | 1]) AS degree ORDER BY key LIMIT 1000";
const EDGE_PAGE = "MATCH (a)-[r]->(b) WITH a, r, b, id(r) AS key RETURN a, r, b, key ORDER BY key LIMIT 1000";
const ALL: Recording[] = [
    cypherCall(NODE_PAGE, {
        results: [
            { n: ANC, key: "151", degree: 1 },
            { n: SEA, key: "22", degree: 1 },
        ],
    }),
    cypherCall(EDGE_PAGE, { results: [{ a: SEA, r: ROUTE, b: ANC, key: "7389" }] }),
];

/** The node page of mode "all" capped at one node, after a key or not. */
const ONE_NODE = (after: boolean): string =>
    `MATCH (n) WITH n, id(n) AS key${after ? " WHERE key > $after" : ""} RETURN n, key, size([(n)--() | 1]) AS degree ORDER BY key LIMIT 1`;
/** The relationships among the nodes loaded so far. */
const AMONG = (after: boolean): string =>
    `MATCH (a)-[r]->(b) WITH a, r, b, id(a) AS ka, id(b) AS kb WHERE ka <= $last AND kb <= $last${after ? " AND (ka > $after OR kb > $after)" : ""} RETURN a, r, b`;
/** Mode "all" capped at one node: a page per node, each with the relationships it completes. */
const CAPPED: Recording[] = [
    cypherCall(ONE_NODE(false), { results: [{ n: ANC, key: "151", degree: 1 }] }),
    cypherCall(AMONG(false), { results: [] }, 200, { last: "151" }),
    cypherCall(ONE_NODE(true), { results: [{ n: SEA, key: "22", degree: 1 }] }, 200, { after: "151" }),
    cypherCall(AMONG(true), { results: [{ a: SEA, r: ROUTE, b: ANC }] }, 200, { last: "22", after: "151" }),
    cypherCall(ONE_NODE(true), { results: [] }, 200, { after: "22" }),
];

describe("neptune over HTTPS (recorded shapes)", () => {
    it("loads everything by id(n), the ~id string", async () => {
        const fetch = replayFetch(ALL);
        const { snapshot, report } = await loadFromSource("neptune", { mode: "all" }, { endpoint: DB, fetch });
        expect([...snapshot.ids].sort()).toEqual(["151", "22"]);
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.nodes.value("code", snapshot.ids.requireIndex("22"))).toBe("SEA");
        expect(snapshot.nodes.value("_source.degree", snapshot.ids.requireIndex("22"))).toBe(1);
        expect(snapshot.edges.value("type", 0)).toBe("route");
        expect(snapshot.edges.value("dist", 0)).toBe(1449);
        expect(report.source?.server).toEqual({ product: "Neptune", profile: "neptune", readOnly: "not-enforced" });
    });

    it("flattens nodes and relationships inside lists and maps", async () => {
        const q = "MATCH (a)-[r]->(b) RETURN collect(a) AS nodes, {route: r, to: b} AS m";
        const fetch = replayFetch([cypherCall(q, { results: [{ nodes: [SEA], m: { route: ROUTE, to: ANC } }] })]);
        const { snapshot } = await loadFromSource("neptune", { query: q }, { endpoint: DB, fetch });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([2, 1]);
    });

    it("reports a query error with its line and column", async () => {
        const q = "MATCH (n RETURN n";
        const fetch = replayFetch([
            cypherCall(
                q,
                {
                    requestId: "r1",
                    code: "MalformedQueryException",
                    detailedMessage: "Invalid input 'R': expected ')' (line 1, column 10 (offset: 9))",
                },
                400,
            ),
        ]);
        const err = await rejection(loadFromSource("neptune", { query: q }, { endpoint: DB, fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_QUERY");
        expect(err.issue?.params).toMatchObject({ serverCode: "MalformedQueryException", line: 1, column: 10 });
    });

    it("finds an error appended to a 200 answer cut short", async () => {
        const q = "MATCH (n) RETURN n";
        const cut = `{"results":[{"n":${JSON.stringify(SEA)}},{"requestId":"r2","code":"TimeLimitExceededException","detailedMessage":"timed out"}`;
        const fetch = replayFetch([cypherCall(q, cut)]);
        const err = await rejection(loadFromSource("neptune", { query: q }, { endpoint: DB, fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_TIMEOUT");
        expect(err.issue?.params).toEqual({ timeoutMs: null, serverSide: true });
    });

    it("probe reads the engine version from /status", async () => {
        const fetch = replayFetch([
            { url: `${DB}/status`, body: { status: "healthy", dbEngineVersion: "1.4.6.0.R1", role: "writer" } },
        ]);
        const probe = await probeSource("neptune", {}, { endpoint: DB, fetch });
        expect(probe.server).toEqual({
            product: "Neptune",
            profile: "neptune",
            readOnly: "not-enforced",
            version: "1.4.6.0.R1",
        });
    });

    it("is refused in a browser before any request, with reason cors", () => {
        const { ctx } = bareContext({}, { runtime: "browser", endpoint: DB });
        expect(() => {
            nodeOnly(ctx, "neptune-https");
        }).toThrow(
            expect.objectContaining({
                issue: expect.objectContaining({
                    code: "E_SOURCE_RUNTIME",
                    params: { runtime: "browser", reason: "cors" },
                }),
            }),
        );
    });
});

describe("neptune analytics (recorded shapes)", () => {
    it("is picked for a neptune-graph host and sends the JSON body", async () => {
        const q = "MATCH (a)-[r]->(b) RETURN a, r, b";
        const fetch = replayFetch([
            {
                method: "POST",
                url: `${GRAPH}/queries`,
                requestBody: JSON.stringify({ query: q, language: "OPEN_CYPHER", parameters: {} }),
                credential: true,
                body: { results: [{ a: SEA, r: ROUTE, b: ANC }] },
            },
        ]);
        const credential = credentials.awsSigV4({ region: "us-east-1", service: "neptune-graph", credentials: AWS });
        const { snapshot } = await loadFromSource("neptune", { query: q }, { endpoint: GRAPH, fetch, credential });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([2, 1]);
    });
});

runSourceConformance(neptuneSource, [
    {
        name: "everything",
        params: { mode: "all" },
        endpoint: DB,
        recordings: [...ALL, ...CAPPED],
        cap: { maxNodes: 1 },
    },
]);
