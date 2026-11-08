/**
 * The `network-data` experiment: with it off, every network-source verb of `session.data` refuses
 * with `E_FEATURE_OFF` (`{ feature: "network-data", key }`) and fetches nothing, nothing waits, and
 * an opened project's `graphty-sources` member is kept exactly as the file held it; with it on,
 * a load works.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../../session";

registerSource(
    defineSource({
        id: "flag-people",
        descriptor: {
            plainName: "People",
            params: [],
            defaultEndpoint: "https://people.example.com",
            examples: [{ id: "flag-people-all", plainName: "Everyone", params: {} }],
        },
        async records(_params: Record<string, never>, ctx) {
            return { nodes: await ctx.fetchJson<{ id: string }[]>("/people") };
        },
    }),
);

/**
 * A fetch that answers two people, counting its calls.
 * @returns The fetch and its count.
 */
function counted(): { fetch: () => Promise<Response>; calls: () => number } {
    let calls = 0;
    return {
        fetch: () => {
            calls++;
            return Promise.resolve(Response.json([{ id: "ana" }, { id: "bo" }]));
        },
        calls: () => calls,
    };
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
 * The `graphty-sources` member of a saved project, as JSON text.
 * @param text - The saved project.
 * @returns The member's text.
 */
function sourcesMember(text: string): string {
    const doc = JSON.parse(text) as { members: { kind: string }[] };
    return JSON.stringify(doc.members.find((member) => member.kind === "graphty-sources"));
}

describe("the network-data experiment, off", () => {
    it("refuses every network-source verb with E_FEATURE_OFF and fetches nothing", async () => {
        await withSession([], async (session) => {
            const { fetch, calls } = counted();
            const input = { source: "flag-people", config: {} };
            const verbs: [string, () => Promise<unknown>][] = [
                ["data.import", () => session.data.import(input, { fetch })],
                ["data.testSource", () => session.data.testSource(input, { fetch })],
                ["data.listSource", () => session.data.listSource(input, {}, { fetch })],
                ["data.previewSource", () => session.data.previewSource(input, { fetch })],
                ["data.checkSource", () => session.data.checkSource("load-1", { fetch })],
                ["data.refresh", () => session.data.refresh("load-1", { fetch })],
                ["data.more", () => session.data.more({ fetch })],
                ["data.expand", () => session.data.expand(["ana"], { fetch })],
                ["data.collapse", () => session.data.collapse("ana")],
                ["data.loadExample", () => session.data.loadExample("flag-people", "flag-people-all", { fetch })],
                ["data.runPendingSourceLoad", () => session.data.runPendingSourceLoad("load-1", { fetch })],
            ];
            for (const [key, call] of verbs) {
                const error = await refusal(call());
                assert.strictEqual(error?.code, "E_FEATURE_OFF", key);
                assert.deepEqual(error?.details, { feature: "network-data", key }, key);
            }

            assert.strictEqual(calls(), 0, "nothing was fetched");
            assert.lengthOf(session.history.steps, 0);
            // A load of a file or inline data is not a network source, and is never refused.
            await session.data.import({
                type: "json",
                config: { data: JSON.stringify({ nodes: [{ id: "x" }], edges: [] }) },
            });
            assert.strictEqual(session.data.nodes().length, 1);
            // No refused load holds the load line: a clear after them settles too.
            await session.data.clear();
            assert.strictEqual(session.data.nodes().length, 0);
        });
    });

    it("keeps an opened project's sources member byte for byte, with nothing waiting", async () => {
        let saved = "";
        await withSession(["network-data"], async (session) => {
            await session.data.import({ source: "flag-people", config: {} }, { fetch: counted().fetch });
            saved = (await session.project.save()).text;
        });

        await withSession([], async (session) => {
            const report = await session.project.open(saved);
            assert.deepInclude(report.problems, {
                code: "E_FEATURE_OFF",
                params: { feature: "network-data", key: "graphty-sources" },
            });
            assert.strictEqual(session.data.nodes().length, 2, "the graph the file holds opens");
            assert.deepEqual(session.data.pendingSourceLoads(), []);
            assert.deepEqual(session.data.loads(), []);
            assert.isNull(session.data.nodeSource("ana"));
            const again = (await session.project.save()).text;
            assert.strictEqual(sourcesMember(again), sourcesMember(saved));
        });
    });
});

describe("the network-data experiment, on", () => {
    it("loads from a network source, and an opened project's load waits", async () => {
        let saved = "";
        await withSession(["network-data"], async (session) => {
            const { fetch, calls } = counted();
            await session.data.loadExample("flag-people", "flag-people-all", { fetch });
            assert.strictEqual(calls(), 1);
            assert.strictEqual(session.data.nodes().length, 2);
            assert.strictEqual(session.data.loads()[0]?.source, "flag-people");
            saved = (await session.project.save()).text;
        });

        await withSession(["network-data"], async (session) => {
            await session.project.open(saved);
            assert.lengthOf(session.data.pendingSourceLoads(), 1);
        });
    });
});
