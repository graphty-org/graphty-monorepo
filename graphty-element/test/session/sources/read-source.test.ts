/**
 * Reading a network source without loading it: `data.readSource` changes nothing and refuses what
 * the renderer could not draw; `data.import` of the read, on another session, loads it with no
 * second fetch and records the load as an ordinary import does.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, credentials, defineSource, type GraphSession, registerSource } from "../../../session";

// The ceilings are in the millions; a read past them is stubbed by lowering them.
vi.mock("../../../src/session/limits", async (original) => {
    const actual = await original<typeof import("../../../src/session/limits")>();
    return { ...actual, DEFAULT_LIMITS: { ...actual.DEFAULT_LIMITS, renderCeiling: 3, edgesDrawn: 2 } };
});

registerSource(
    defineSource({
        id: "read-people",
        descriptor: {
            plainName: "People",
            params: [],
            auth: ["basic"],
            authRequired: "optional",
            defaultEndpoint: "https://people.example.com",
        },
        async records(_params: Record<string, never>, ctx) {
            return ctx.fetchJson<{ nodes: { id: string }[]; edges: { source: string; target: string }[] }>("/people");
        },
    }),
);

const INPUT = { source: "read-people", config: {}, name: "People" };

/**
 * A fetch that answers a graph, counting its calls.
 * @param nodes - how many nodes it answers, in a chain.
 * @returns The fetch and its count.
 */
function server(nodes: number): { fetch: () => Promise<Response>; calls: () => number } {
    const ids = Array.from({ length: nodes }, (_, i) => `n${String(i)}`);
    let calls = 0;
    return {
        fetch: () => {
            calls++;
            return Promise.resolve(
                Response.json({
                    nodes: ids.map((id) => ({ id })),
                    edges: ids.slice(1).map((target, i) => ({ source: ids[i], target })),
                }),
            );
        },
        calls: () => calls,
    };
}

/**
 * Run a body against a session, disposing it after.
 * @param features - The experiments it switches on.
 * @param body - The body.
 * @returns Settles once the body has.
 */
async function withSession(features: string[], body: (session: GraphSession) => Promise<void>): Promise<void> {
    const session = createGraphSession({ features });
    try {
        await body(session);
    } finally {
        session.dispose();
    }
}

/**
 * What a promise rejected with, or null.
 * @param promise - The promise.
 * @returns The error's code and details.
 */
async function refusal(promise: Promise<unknown>): Promise<{ code?: string; details?: unknown } | null> {
    return promise.then(
        () => null,
        (error: unknown) => error as { code?: string; details?: unknown },
    );
}

describe("data.readSource", () => {
    it("reads and changes nothing; import on another session loads it with no second fetch", async () => {
        const { fetch, calls } = server(3);
        await withSession(["network-data"], async (scratch) => {
            const read = await scratch.data.readSource(INPUT, {
                fetch,
                credential: credentials.basic("ana", "secret"),
                limits: { maxNodes: 3, onLimit: "stop" },
            });
            assert.strictEqual(read.nodes, 3);
            assert.strictEqual(read.edges, 2);
            assert.lengthOf(scratch.data.nodes(), 0, "the read drew nothing");
            assert.lengthOf(scratch.data.sources(), 0);
            assert.lengthOf(scratch.data.loads(), 0);
            assert.lengthOf(scratch.history.steps, 0);

            await withSession(["network-data"], async (session) => {
                await session.data.import(read, { history: "start" });
                assert.lengthOf(session.data.nodes(), 3);
                assert.lengthOf(session.data.edges(), 2);
                assert.lengthOf(session.data.sources(), 1);
                const [load] = session.data.loads();
                assert.strictEqual(load.source, "read-people");
                assert.strictEqual(load.credential?.username, "ana", "who the credential was");
                assert.deepEqual(
                    (load.options as { limits?: unknown }).limits,
                    { maxNodes: 3, onLimit: "stop" },
                    "the choices the read was made with stay with the load",
                );
                assert.notInclude(JSON.stringify(load), "secret");
            });
        });
        assert.strictEqual(calls(), 1, "the service was read once");
    });

    it("refuses with the experiment off and fetches nothing", async () => {
        const { fetch, calls } = server(1);
        await withSession([], async (session) => {
            const error = await refusal(session.data.readSource(INPUT, { fetch }));
            assert.strictEqual(error?.code, "E_FEATURE_OFF");
            assert.deepEqual(error?.details, { feature: "network-data", key: "data.readSource" });
        });
        assert.strictEqual(calls(), 0);
    });

    it("rejects with the source's code and leaves nothing behind", async () => {
        await withSession(["network-data"], async (session) => {
            const fetch = (): Promise<Response> => Promise.resolve(new Response("no", { status: 401 }));
            const error = await refusal(session.data.readSource(INPUT, { fetch }));
            assert.strictEqual(error?.code, "E_SOURCE_AUTH");
            assert.lengthOf(session.data.nodes(), 0);
            assert.lengthOf(session.data.sources(), 0);
        });
    });

    it("refuses nodes past the render ceiling with E_TOO_LARGE before anything opens", async () => {
        await withSession(["network-data"], async (session) => {
            const error = await refusal(session.data.readSource(INPUT, { fetch: server(4).fetch }));
            assert.strictEqual(error?.code, "E_TOO_LARGE");
            assert.deepEqual(error?.details, { limit: 3, count: 4, of: "nodes", graph: { nodes: 0, edges: 0 } });
        });
    });

    it("refuses edges past the drawn ceiling with E_TOO_LARGE", async () => {
        const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
        const edges = [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
            { source: "c", target: "a" },
        ];
        const fetch = (): Promise<Response> => Promise.resolve(Response.json({ nodes, edges }));
        await withSession(["network-data"], async (session) => {
            const error = await refusal(session.data.readSource(INPUT, { fetch }));
            assert.strictEqual(error?.code, "E_TOO_LARGE");
            assert.deepEqual(error?.details, { limit: 2, count: 3, of: "edges", graph: { nodes: 0, edges: 0 } });
        });
    });
});
