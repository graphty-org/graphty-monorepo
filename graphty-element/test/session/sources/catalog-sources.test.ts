/**
 * `sourceDescriptors()` from `./catalog` lists every network source with its descriptor and its
 * public samples, graph-samples' datasets among them, loading no source's code; and the
 * `graph-samples` source, written with the public `defineSource`, loads a dataset.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { sourceDescriptors } from "../../../catalog";
import { createGraphSession, defineSource, registerSource } from "../../../session";

// A source whose sample has its own endpoint and a published login, as the Neo4j demo's do.
registerSource(
    defineSource({
        id: "sample-login",
        descriptor: {
            plainName: "Sample with a login",
            params: [],
            samples: [
                {
                    id: "sample-login-demo",
                    plainName: "The demo",
                    params: { team: "demo" },
                    endpoint: "https://demo.example.com",
                    publicLogin: { username: "demo", password: "demo" },
                },
            ],
        },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/people?team=${params.team}`);
            return { nodes: rows };
        },
    }),
);

/** graph-samples' own build of the karate club dataset, as graphty.app serves it. */
const KARATE = readFileSync(new URL("../../../../graph-samples/dist/data/v1/karate.gsnp.gz", import.meta.url));

describe("sourceDescriptors()", () => {
    it("lists the built-in sources and graph-samples with their samples, loading no source code", () => {
        const infos = sourceDescriptors();
        const ids = infos.map((info) => info.id);
        for (const id of ["ndex", "cypher", "neo4j", "neptune", "rest", "openalex", "sparql", "graph-samples"]) {
            assert.include(ids, id);
        }

        for (const info of infos.filter(
            (each) => !["graph-samples", "sample-login"].includes(each.id) && !each.id.startsWith("people"),
        )) {
            assert.isFalse(info.loaded, `${info.id}'s code was loaded`);
        }

        const samples = infos.find((info) => info.id === "graph-samples")?.descriptor.samples ?? [];
        const karate = samples.find((sample) => sample.params.dataset === "karate");
        assert.deepEqual(karate?.counts, { nodes: 34, edges: 78 });
        assert.isAbove(infos.find((info) => info.id === "ndex")?.descriptor.samples?.length ?? 0, 0);
    });
});

describe("the graph-samples source", () => {
    it("loads a dataset through session.data.import, with a counted fetch", async () => {
        const session = createGraphSession();
        try {
            const asked: string[] = [];
            const fetch = (input: string | URL | Request): Promise<Response> => {
                asked.push(String(input instanceof Request ? input.url : input));
                return Promise.resolve(new Response(KARATE, { headers: { "content-type": "application/gzip" } }));
            };
            await session.data.import({ source: "graph-samples", config: { dataset: "karate" } }, { fetch });
            assert.deepEqual(asked, ["https://graphty.app/data/graph-samples/v1/karate.gsnp.gz"]);
            assert.strictEqual(session.data.nodes().length, 34);
            assert.strictEqual(session.data.edges().length, 78);
            assert.strictEqual(session.data.loads()[0].source, "graph-samples");
        } finally {
            session.dispose();
        }
    });

    it("refuses a dataset it does not list before any request", async () => {
        const session = createGraphSession();
        try {
            let calls = 0;
            const fetch = (): Promise<Response> => {
                calls++;
                return Promise.resolve(new Response(""));
            };
            const error = await session.data
                .import({ source: "graph-samples", config: { dataset: "no-such-dataset" } }, { fetch })
                .then(
                    () => null,
                    (e: unknown) => e as { code?: string },
                );
            assert.strictEqual(error?.code, "E_SOURCE_PARAM");
            assert.strictEqual(calls, 0);
        } finally {
            session.dispose();
        }
    });
});

describe("session.data.loadSample", () => {
    it("loads a graph-samples dataset by its sample id in one call", async () => {
        const session = createGraphSession();
        try {
            const fetch = (): Promise<Response> =>
                Promise.resolve(new Response(KARATE, { headers: { "content-type": "application/gzip" } }));
            await session.data.loadSample("graph-samples-karate", { fetch });
            assert.strictEqual(session.data.nodes().length, 34);
            const [load] = session.data.loads();
            assert.strictEqual(load.source, "graph-samples");
            assert.deepEqual(load.config, { dataset: "karate" });
            assert.lengthOf(session.history.steps, 1, "one undoable step");
        } finally {
            session.dispose();
        }
    });

    it("uses the sample's endpoint and its published login, which a caller's options override", async () => {
        const session = createGraphSession();
        try {
            const asked: { url: string; auth: string | null }[] = [];
            const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
                const request = new Request(input, init);
                asked.push({ url: request.url, auth: request.headers.get("authorization") });
                return Promise.resolve(Response.json([{ id: "a" }, { id: "b" }]));
            };
            await session.data.loadSample("sample-login-demo", { fetch });
            assert.deepEqual(asked, [
                { url: "https://demo.example.com/people?team=demo", auth: `Basic ${btoa("demo:demo")}` },
            ]);
            assert.strictEqual(session.data.nodes().length, 2);
            assert.strictEqual(session.data.loads()[0].credential?.username, "demo");

            await session.data.loadSample("sample-login-demo", { fetch, endpoint: "https://other.example.com" });
            assert.strictEqual(asked[1]?.url, "https://other.example.com/people?team=demo");
        } finally {
            session.dispose();
        }
    });

    it("a sample load that starts the history drops the steps before it", async () => {
        const session = createGraphSession();
        try {
            const fetch = (): Promise<Response> => Promise.resolve(Response.json([{ id: "a" }, { id: "b" }]));
            await session.data.addNodes([{ id: "before" }]);
            await session.data.loadSample("sample-login-demo", { fetch, history: "start" });
            assert.strictEqual(session.data.nodes().length, 2);
            assert.lengthOf(session.history.steps, 0, "the history starts at the loaded graph");
            assert.isFalse(session.canUndo);
        } finally {
            session.dispose();
        }
    });

    it("refuses an id no source lists with E_SOURCE_UNKNOWN, naming the ids it knows", async () => {
        const session = createGraphSession();
        try {
            const error = await session.data.loadSample("no-such-sample").then(
                () => null,
                (e: unknown) => e as { code?: string; details?: { id?: string; known?: string[] } },
            );
            assert.strictEqual(error?.code, "E_SOURCE_UNKNOWN");
            assert.strictEqual(error?.details?.id, "no-such-sample");
            assert.include(error?.details?.known ?? [], "graph-samples-karate");
            assert.lengthOf(session.history.steps, 0);
        } finally {
            session.dispose();
        }
    });
});
