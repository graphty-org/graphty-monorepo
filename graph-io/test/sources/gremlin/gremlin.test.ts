/**
 * The `gremlin` source over hand-written answers in the shapes Apache TinkerPop documents for
 * Gremlin Server (GraphSON 3 over HTTP and over a WebSocket; no public server exists to record
 * from): TinkerPop's "modern" toy graph, paths, elementMap() pages, errors, the SASL login, and
 * the refusals before any request. The WebSocket is a stand-in installed as the global.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    credentials,
    expandFromSource,
    loadFromSource,
    probeSource,
    type Recording,
    replayFetch,
} from "../../../src/index.js";
import { gremlinSource } from "../../../src/sources/gremlin/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection, SENTINEL } from "../helpers.js";

const HTTP = "https://gremlin.example.com:8182/gremlin";
const WS = "wss://gremlin.example.com:8182/gremlin";

/** A typed GraphSON 3 value. */
const t = (type: string, value: unknown): unknown => ({ "@type": type, "@value": value });
const int = (n: number): unknown => t("g:Int64", n);
const list = (...xs: unknown[]): unknown => t("g:List", xs);
const map = (...kv: unknown[]): unknown => t("g:Map", kv);
const T = (name: string): unknown => t("g:T", name);
const D = (name: string): unknown => t("g:Direction", name);

const MARKO = t("g:Vertex", {
    id: int(1),
    label: "person",
    properties: {
        name: [t("g:VertexProperty", { id: int(0), value: "marko", label: "name" })],
        age: [t("g:VertexProperty", { id: int(2), value: t("g:Int32", 29), label: "age" })],
    },
});
const VADAS = t("g:Vertex", { id: int(2), label: "person" });
const KNOWS = t("g:Edge", {
    id: int(7),
    label: "knows",
    inVLabel: "person",
    outVLabel: "person",
    inV: int(2),
    outV: int(1),
    properties: { weight: t("g:Property", { key: "weight", value: t("g:Double", 0.5) }) },
});

/** elementMap() of a vertex and of an edge. */
const vMap = (id: number, label: string, name: string): unknown =>
    map(T("id"), int(id), T("label"), label, "name", name);
const eMap = (id: number, from: number, to: number): unknown =>
    map(
        T("id"),
        int(id),
        T("label"),
        "created",
        D("IN"),
        map(T("id"), int(to), T("label"), "software"),
        D("OUT"),
        map(T("id"), int(from), T("label"), "person"),
        "weight",
        t("g:Double", 0.4),
    );

/** A successful HTTP answer. */
const ok = (...data: unknown[]): unknown => ({
    requestId: "41d2e28a-20a4-4ab0-b379-d810dede3786",
    status: { message: "", code: 200, attributes: map() },
    result: { data: list(...data), meta: map() },
});

/**
 * One recorded HTTP exchange.
 * @param gremlin - the script sent
 * @param body - the answer
 * @param bindings - the bindings sent
 * @param status - the status
 * @returns the recording
 */
function call(gremlin: string, body: unknown, bindings: unknown = {}, status = 200): Recording {
    return {
        method: "POST",
        url: HTTP,
        requestBody: JSON.stringify({ gremlin, bindings, language: "gremlin-groovy" }),
        status,
        body,
    };
}

const QUERY = "g.V(1).outE('knows').path()";
const PATH = t("g:Path", { labels: list(), objects: list(MARKO, KNOWS, VADAS) });
const ALL: Recording[] = [
    call("g.V().range(0, 2).elementMap()", ok(vMap(1, "person", "marko"), vMap(3, "software", "lop"))),
    call("g.V().range(2, 4).elementMap()", ok(vMap(4, "person", "josh"))),
    call("g.E().range(0, 2).elementMap()", ok(eMap(9, 1, 3), eMap(11, 4, 3))),
    call("g.E().range(2, 4).elementMap()", ok()),
];
const AROUND = "g.V(ids).emit().repeat(bothE().otherV().simplePath()).times(1).path().by(elementMap()).limit(1000)";

describe("the gremlin source over HTTP", () => {
    it("reads vertices, edges and paths of GraphSON 3", async () => {
        const { snapshot, report, format } = await loadFromSource(
            gremlinSource,
            { query: QUERY },
            { endpoint: HTTP, fetch: replayFetch([call(QUERY, ok(PATH))]) },
        );
        expect(format).toBe("source:gremlin");
        expect([...snapshot.ids]).toEqual([1, 2]);
        expect(snapshot.directed).toBe(true);
        const marko = snapshot.ids.requireIndex(1);
        expect(snapshot.nodes.value("name", marko)).toBe("marko");
        expect(snapshot.nodes.value("age", marko)).toBe(29);
        expect(snapshot.nodes.value("labels", marko)).toEqual(["person"]);
        expect(snapshot.edges.value("type", 0)).toBe("knows");
        expect(snapshot.edges.value("weight", 0)).toBe(0.5);
        expect(snapshot.edges.value("id", 0)).toBe("7");
        expect(report.counts).toMatchObject({ nodes: 2, edges: 1 });
    });

    it("sends the bindings and the traversal source alias, never splicing them", async () => {
        const fetch = replayFetch([
            {
                method: "POST",
                url: HTTP,
                requestBody: JSON.stringify({
                    gremlin: "g.V(x)",
                    bindings: { x: "a'b" },
                    language: "gremlin-groovy",
                    aliases: { g: "ro" },
                }),
                body: ok(VADAS),
            },
        ]);
        const { snapshot } = await loadFromSource(
            gremlinSource,
            { query: "g.V(x)", bindings: { x: "a'b" }, traversalSource: "ro" },
            { endpoint: HTTP, fetch },
        );
        expect(snapshot.nodeCount).toBe(1);
        await expect(
            rejection(loadFromSource(gremlinSource, { query: "g.V()", traversalSource: "x;drop" }, { endpoint: HTTP })),
        ).resolves.toMatchObject({ issue: { params: { name: "traversalSource", reason: "identifier" } } });
    });

    it("pages every vertex then every edge, and resumes from a capped load's cursor", async () => {
        const params = { mode: "all" as const, pageSize: 2 };
        const whole = await loadFromSource(gremlinSource, params, { endpoint: HTTP, fetch: replayFetch(ALL) });
        expect(whole.snapshot.nodeCount).toBe(3);
        expect(whole.snapshot.edgeCount).toBe(2);
        expect(whole.report.source?.next).toBeNull();
        const first = await loadFromSource(gremlinSource, params, {
            endpoint: HTTP,
            fetch: replayFetch(ALL),
            limits: { maxNodes: 1 },
        });
        expect(first.snapshot.nodeCount).toBe(2);
        const cursor = first.report.source?.next ?? undefined;
        expect(cursor).toBeDefined();
        const rest = await loadFromSource(gremlinSource, params, { endpoint: HTTP, fetch: replayFetch(ALL), cursor });
        // the last vertex page, then every edge with its ends
        expect(rest.snapshot.edgeCount).toBe(2);
        expect([...rest.snapshot.ids].sort()).toEqual([1, 3, 4]);
        expect(rest.report.source?.next).toBeNull();
    });

    it("reads a neighborhood and expands with direction, depth and edge labels as bindings", async () => {
        const { snapshot } = await loadFromSource(
            gremlinSource,
            { mode: "neighborhood", ids: [1] },
            { endpoint: HTTP, fetch: replayFetch([call(AROUND, ok(PATH), { ids: [1] })]) },
        );
        expect(snapshot.edgeCount).toBe(1);
        const script =
            "g.V(ids).emit().repeat(outE().hasLabel(within(labels)).inV().simplePath()).times(2).path().by(elementMap()).limit(10)";
        const around = await expandFromSource(
            gremlinSource,
            { params: {}, ids: [1], direction: "out", depth: 2, limit: 10, relationshipTypes: ["created"] },
            {
                endpoint: HTTP,
                fetch: replayFetch([call(script, ok(eMap(9, 1, 3)), { ids: [1], labels: ["created"] })]),
            },
        );
        expect([...around.snapshot.ids].sort()).toEqual([1, 3]);
        expect(around.snapshot.nodes.value("labels", around.snapshot.ids.requireIndex(3))).toEqual(["software"]);
    });

    it("reads untyped GraphSON, valueMap(true) and JanusGraph edge ids", async () => {
        const untyped = {
            result: {
                data: [
                    { id: "a", label: "user", type: "vertex", properties: { name: [{ id: "p", value: "ann" }] } },
                    { id: { relationId: "4r6-39s" }, label: "follows", type: "edge", inV: "b", outV: "a" },
                    map(T("id"), "c", T("label"), "user", "name", list("cy")),
                ],
            },
        };
        const { snapshot } = await loadFromSource(
            gremlinSource,
            { query: "g.V()" },
            { endpoint: HTTP, fetch: replayFetch([call("g.V()", untyped)]) },
        );
        expect([...snapshot.ids]).toEqual(["a", "b", "c"]);
        expect(snapshot.nodes.value("name", snapshot.ids.requireIndex("c"))).toBe("cy");
        expect(snapshot.edges.value("id", 0)).toBe("4r6-39s");
    });

    it("raises coded errors: a refused script, a timeout, not a graph, not GraphSON", async () => {
        const at = (r: Recording) => ({ endpoint: HTTP, fetch: replayFetch([r]) });
        const bad = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V(" },
                at(
                    call(
                        "g.V(",
                        { message: "unexpected token", "Exception-Class": "MalformedQueryException" },
                        {},
                        400,
                    ),
                ),
            ),
        );
        expect(bad.issue).toMatchObject({
            code: "E_SOURCE_QUERY",
            params: { serverCode: "MalformedQueryException", serverMessage: "unexpected token" },
        });
        const fault = await rejection(
            loadFromSource(gremlinSource, { query: "g.V(" }, at(call("g.V(", { message: "at java.lang.X" }, {}, 500))),
        );
        expect(fault.issue?.params).toMatchObject({ serverMessage: null });
        const slow = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V()" },
                at(call("g.V()", { code: "TimeLimitExceededException", detailedMessage: "too long" }, {}, 500)),
            ),
        );
        expect(slow.issue?.code).toBe("E_SOURCE_TIMEOUT");
        const counted = await rejection(
            loadFromSource(gremlinSource, { query: "g.V().count()" }, at(call("g.V().count()", ok(int(6))))),
        );
        expect(counted.issue?.code).toBe("E_SOURCE_NOT_A_GRAPH");
        const html = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V()" },
                at({ ...call("g.V()", "<html></html>"), headers: { "content-type": "text/html" } }),
            ),
        );
        expect(html.issue?.code).toBe("E_SOURCE_RESPONSE");
    });

    it("refuses bad params and a bad scheme before any request", async () => {
        const fetch = replayFetch([]);
        const params = async (p: Record<string, unknown>, endpoint = HTTP) =>
            (await rejection(loadFromSource(gremlinSource, p, { endpoint, fetch }))).issue?.params;
        await expect(params({ mode: "neighborhood" })).resolves.toEqual({ name: "ids", reason: "required" });
        await expect(params({ mode: "neighborhood", ids: [{}] })).resolves.toEqual({ name: "ids", reason: "type" });
        await expect(params({ mode: "query" })).resolves.toEqual({ name: "query", reason: "required" });
        await expect(params({ depth: 11 })).resolves.toEqual({ name: "depth", reason: "range" });
        await expect(params({ query: "g.V()" }, "bolt://h:7687")).resolves.toEqual({
            name: "endpoint",
            reason: "scheme",
        });
        expect(fetch.calls).toHaveLength(0);
    });

    it("probes with a one-vertex script and says read-only is not enforced", async () => {
        const fetch = replayFetch([call("g.V().limit(1).count()", ok(int(1)))]);
        await expect(probeSource(gremlinSource, {}, { endpoint: HTTP, fetch })).resolves.toEqual({
            ok: true,
            server: { readOnly: "not-enforced" },
        });
    });
});

/** What the stand-in socket answers each request with. */
type Responder = (request: { requestId: string; op: string; args: Record<string, unknown> }) => unknown[];

/**
 * Install a stand-in WebSocket that decodes each binary frame and answers through `respond`.
 * @param respond - the server's answers to one request
 * @returns the frames' media types and requests, and the sockets opened
 */
function fakeSocket(respond: Responder) {
    const seen = {
        mimes: [] as string[],
        requests: [] as { op: string; args: Record<string, unknown> }[],
        urls: [] as string[],
    };
    class FakeWebSocket {
        binaryType = "blob";
        onopen: (() => void) | null = null;
        onmessage: ((e: { data: unknown }) => void) | null = null;
        onclose: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(url: string) {
            seen.urls.push(url);
            queueMicrotask(() => this.onopen?.());
        }
        send(data: Uint8Array): void {
            const n = data[0];
            seen.mimes.push(new TextDecoder().decode(data.slice(1, 1 + n)));
            const message = JSON.parse(new TextDecoder().decode(data.slice(1 + n))) as {
                requestId: { "@value": string };
                op: string;
                args: Record<string, unknown>;
            };
            const requestId = message.requestId["@value"];
            seen.requests.push({ op: message.op, args: message.args });
            for (const answer of respond({ requestId, op: message.op, args: message.args })) {
                const text = JSON.stringify({ requestId, ...(answer as object) });
                queueMicrotask(() => this.onmessage?.({ data: new TextEncoder().encode(text).buffer }));
            }
        }
        close(): void {
            queueMicrotask(() => this.onclose?.());
        }
    }
    vi.stubGlobal("WebSocket", FakeWebSocket);
    return seen;
}

describe("the gremlin source over a WebSocket", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("sends GraphSON 3 frames and joins partial answers", async () => {
        const seen = fakeSocket(() => [
            { status: { code: 206 }, result: { data: list(MARKO) } },
            { status: { code: 200 }, result: { data: list(KNOWS) } },
        ]);
        const { snapshot } = await loadFromSource(
            gremlinSource,
            { query: "g.V(x)", bindings: { x: 1 } },
            { endpoint: WS },
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
        expect(seen.urls).toEqual([WS]);
        expect(seen.mimes).toEqual(["application/vnd.gremlin-v3.0+json"]);
        expect(seen.requests[0]).toEqual({
            op: "eval",
            args: { gremlin: "g.V(x)", bindings: { x: int(1) }, language: "gremlin-groovy" },
        });
    });

    it("logs in with SASL PLAIN on the server's challenge, and never leaks the password", async () => {
        const seen = fakeSocket((r) =>
            r.op === "eval" ? [{ status: { code: 407 } }] : [{ status: { code: 200 }, result: { data: list(VADAS) } }],
        );
        const result = await loadFromSource(
            gremlinSource,
            { query: "g.V(2)" },
            { endpoint: WS, credential: credentials.basic("reader", SENTINEL) },
        );
        expect(result.snapshot.nodeCount).toBe(1);
        expect(seen.requests[1]).toEqual({
            op: "authentication",
            args: { saslMechanism: "PLAIN", sasl: btoa(`\u0000reader\u0000${SENTINEL}`) },
        });
        expect(JSON.stringify(result.report)).not.toContain(SENTINEL);
    });

    it("raises the protocol's codes: a refused login, a script error, a timeout", async () => {
        const codes = [
            [401, "E_SOURCE_AUTH"],
            [597, "E_SOURCE_QUERY"],
            [598, "E_SOURCE_TIMEOUT"],
        ] as const;
        for (const [code, expected] of codes) {
            fakeSocket(() => [
                {
                    status: {
                        code,
                        message: "No such property: x",
                        attributes: { exceptions: list("groovy.lang.MissingPropertyException") },
                    },
                },
            ]);
            const err = await rejection(loadFromSource(gremlinSource, { query: "g.V()" }, { endpoint: WS }));
            expect(err.issue?.code).toBe(expected);
            if (code === 597) {
                expect(err.issue?.params).toMatchObject({
                    serverCode: "groovy.lang.MissingPropertyException",
                    serverMessage: "No such property: x",
                });
            }
        }
    });

    it("rejects with the signal's reason when aborted mid-request", async () => {
        fakeSocket(() => []);
        const controller = new AbortController();
        const reason = new Error("stop");
        const run = loadFromSource(gremlinSource, { query: "g.V()" }, { endpoint: WS, signal: controller.signal });
        queueMicrotask(() => {
            queueMicrotask(() => {
                controller.abort(reason);
            });
        });
        await expect(run).rejects.toBe(reason);
    });

    it("refuses a non-basic credential, a credential without TLS, and a runtime with no WebSocket", async () => {
        fakeSocket(() => []);
        const kind = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V()" },
                { endpoint: WS, credential: credentials.bearer(SENTINEL) },
            ),
        );
        expect(kind.issue?.params).toEqual({ name: "credential", reason: "kind" });
        const clear = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V()" },
                { endpoint: "ws://gremlin.example.com:8182/gremlin", credential: credentials.basic("u", SENTINEL) },
            ),
        );
        expect(clear.issue?.params).toEqual({ name: "endpoint", reason: "insecure-endpoint" });
        vi.stubGlobal("WebSocket", undefined);
        const none = await rejection(loadFromSource(gremlinSource, { query: "g.V()" }, { endpoint: WS }));
        expect(none.issue?.params).toMatchObject({ reason: "needs-websocket" });
    });

    it("reports a socket that closes before answering as unreachable", async () => {
        class Closing {
            binaryType = "blob";
            onopen: (() => void) | null = null;
            onclose: (() => void) | null = null;
            onerror: (() => void) | null = null;
            onmessage: unknown = null;
            constructor() {
                queueMicrotask(() => this.onopen?.());
            }
            send(): void {
                queueMicrotask(() => this.onclose?.());
            }
            close(): void {}
        }
        vi.stubGlobal("WebSocket", Closing);
        const err = await rejection(loadFromSource(gremlinSource, { query: "g.V()" }, { endpoint: WS }));
        expect(err.issue).toMatchObject({ code: "E_FETCH", params: { status: null } });
    });
});

runSourceConformance(gremlinSource, [
    { name: "a path script", params: { query: QUERY }, endpoint: HTTP, recordings: [call(QUERY, ok(PATH))] },
    {
        name: "every element, paged",
        params: { mode: "all", pageSize: 2 },
        endpoint: HTTP,
        recordings: ALL,
        cap: { maxNodes: 1 },
    },
    {
        name: "a refused login",
        params: { query: QUERY },
        endpoint: HTTP,
        recordings: [{ ...call(QUERY, { message: "Username and/or password are incorrect" }), status: 401 }],
        credential: (secret) => credentials.basic("reader", secret),
    },
]);
