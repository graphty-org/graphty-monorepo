/**
 * `sourceDescriptors()` from `./catalog` lists every network source with its descriptor and its
 * public examples, loading no source's code; graph-samples' datasets are not a network source;
 * and `session.data.loadExample(source, id)` loads an example in one call.
 */

import { assert, describe, it } from "vitest";

import { sourceDescriptors } from "../../../catalog";
import { createGraphSession, defineSource, registerSource } from "../../../session";

// A source whose example has its own endpoint and a published login, as the Neo4j demo's do; two
// examples at one origin with different logins, told apart by their database.
registerSource(
    defineSource({
        id: "example-login",
        descriptor: {
            plainName: "Example with a login",
            params: [],
            examples: [
                {
                    id: "example-login-demo",
                    plainName: "The demo",
                    params: { team: "demo", database: "demo" },
                    endpoint: "https://demo.example.com",
                    publicLogin: { username: "demo", password: "demo" },
                },
                {
                    id: "example-login-other",
                    plainName: "The other database",
                    params: { team: "other", database: "other" },
                    endpoint: "https://demo.example.com",
                    publicLogin: { username: "other", password: "other" },
                },
            ],
        },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/people?team=${params.team}`);
            return { nodes: rows };
        },
    }),
);

/**
 * A fetch that answers two people and remembers each request's URL and Authorization header.
 * @returns The fetch and what it was asked.
 */
function people(): {
    fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    asked: { url: string; auth: string | null }[];
} {
    const asked: { url: string; auth: string | null }[] = [];
    const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init);
        asked.push({ url: request.url, auth: request.headers.get("authorization") });
        return Promise.resolve(Response.json([{ id: "a" }, { id: "b" }]));
    };
    return { fetch, asked };
}

describe("sourceDescriptors()", () => {
    it("lists the built-in sources with their examples, loading no source code", () => {
        const infos = sourceDescriptors();
        const ids = infos.map((info) => info.id);
        for (const id of ["ndex", "cypher", "neo4j", "neptune", "rest", "openalex", "sparql"]) {
            assert.include(ids, id);
        }

        for (const info of infos.filter((each) => each.id !== "example-login" && !each.id.startsWith("people"))) {
            assert.isFalse(info.loaded, `${info.id}'s code was loaded`);
        }

        assert.isAbove(infos.find((info) => info.id === "ndex")?.descriptor.examples?.length ?? 0, 0);
        assert.isAbove(infos.find((info) => info.id === "neo4j")?.descriptor.examples?.length ?? 0, 0);
    });

    it("does not list graph-samples' datasets: they load through session.data.loadDataset", () => {
        assert.notInclude(
            sourceDescriptors().map((info) => info.id),
            "graph-samples",
        );
    });
});

describe("session.data.loadExample", () => {
    it("uses the example's endpoint and its published login, which a caller's options override", async () => {
        const session = createGraphSession();
        try {
            const { fetch, asked } = people();
            await session.data.loadExample("example-login", "example-login-demo", { fetch });
            assert.deepEqual(asked, [
                { url: "https://demo.example.com/people?team=demo", auth: `Basic ${btoa("demo:demo")}` },
            ]);
            assert.strictEqual(session.data.nodes().length, 2);
            const [load] = session.data.loads();
            assert.strictEqual(load.source, "example-login");
            assert.strictEqual(load.credential?.username, "demo");
            assert.lengthOf(session.history.steps, 1, "one undoable step");

            await session.data.loadExample("example-login", "example-login-demo", {
                fetch,
                endpoint: "https://other.example.com",
            });
            assert.strictEqual(asked[1]?.url, "https://other.example.com/people?team=demo");
        } finally {
            session.dispose();
        }
    });

    it("a refresh of an example reaches its server with that example's login, not another's there", async () => {
        const session = createGraphSession();
        try {
            const { fetch, asked } = people();
            await session.data.loadExample("example-login", "example-login-other", { fetch });
            await session.data.refresh(session.data.loads()[0].key, { fetch });
            assert.deepEqual(
                asked.map((each) => each.auth),
                [`Basic ${btoa("other:other")}`, `Basic ${btoa("other:other")}`],
            );
        } finally {
            session.dispose();
        }
    });

    it("an example load that starts the history drops the steps before it", async () => {
        const session = createGraphSession();
        try {
            const { fetch } = people();
            await session.data.addNodes([{ id: "before" }]);
            await session.data.loadExample("example-login", "example-login-demo", { fetch, history: "start" });
            assert.strictEqual(session.data.nodes().length, 2);
            assert.lengthOf(session.history.steps, 0, "the history starts at the loaded graph");
            assert.isFalse(session.canUndo);
        } finally {
            session.dispose();
        }
    });

    it("refuses an id the source does not list with E_SOURCE_UNKNOWN, naming the ids it knows", async () => {
        const session = createGraphSession();
        try {
            const error = await session.data.loadExample("example-login", "no-such-example").then(
                () => null,
                (e: unknown) => e as { code?: string; details?: { source?: string; id?: string; known?: string[] } },
            );
            assert.strictEqual(error?.code, "E_SOURCE_UNKNOWN");
            assert.strictEqual(error?.details?.source, "example-login");
            assert.strictEqual(error?.details?.id, "no-such-example");
            assert.deepEqual(error?.details?.known, ["example-login-demo", "example-login-other"]);
            assert.lengthOf(session.history.steps, 0);
        } finally {
            session.dispose();
        }
    });
});
