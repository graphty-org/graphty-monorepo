/**
 * @file Counted-work scaling of the session's verbs that read a network source: loading a sample,
 * paging a capped load, refreshing a load, expanding and collapsing a node, and running the load a
 * reopened project left waiting. Each runs on a graph of n and of 4n nodes, bringing, changing or
 * taking away n or 4n rows, and the elements it visits (see `visitsDuring`) may grow no faster than
 * that: 4x, never 16x (issue #1643). Counted, never timed.
 *
 * The sources are registered here and answer from memory, so nothing reaches the network. Strict
 * state is off, as it is for a consumer (see `mutation-scaling.test.ts`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [200, 800] as const;

/** Every source here claims this endpoint, so a saved load is recorded as a network load. */
const ENDPOINT = "https://scaling.example.com";

/** What the refreshed source serves as each node's name; a test changes it between load and refresh. */
let liveName = "before";

/**
 * A path of `size` nodes named `<prefix><i>`.
 * @param size - The node count.
 * @param prefix - The id prefix.
 * @returns The rows.
 */
function pathRows(
    size: number,
    prefix: string,
): { nodes: { id: string; name: string }[]; edges: { source: string; target: string }[] } {
    const nodes = Array.from({ length: size }, (_, at) => ({ id: `${prefix}${String(at)}`, name: liveName }));
    const edges = nodes.slice(1).map((node, at) => ({ source: nodes[at].id, target: node.id }));
    return { nodes, edges };
}

/** Its params: how many nodes a read brings. */
interface SizeParams {
    readonly size: number;
}

registerSource(
    defineSource({
        id: "scaling-path",
        descriptor: {
            plainName: "Scaling path",
            defaultEndpoint: ENDPOINT,
            params: [{ name: "size", plainName: "Size", type: "integer", required: true }],
            features: ["expand"],
            samples: SIZES.map((size) => ({
                id: `scaling-path-${String(size)}`,
                plainName: `Path of ${String(size)}`,
                params: { size },
            })),
        },
        records: (params: SizeParams) => Promise.resolve(pathRows(params.size, "p")),
        expand(request, sink, ctx) {
            // Every seed brings as many new neighbors as the load brought nodes.
            const { size } = request.params;
            for (const seed of request.ids) {
                for (let at = 0; at < size; at++) {
                    const id = `${String(seed)}-x${String(at)}`;
                    sink.addNodeRecord(id, {});
                    sink.addEdgeRecord(seed, id, {});
                }
            }

            return Promise.resolve(ctx.finish({ next: null }));
        },
    }),
);

registerSource(
    defineSource({
        id: "scaling-pages",
        descriptor: {
            plainName: "Scaling pages",
            defaultEndpoint: ENDPOINT,
            params: [{ name: "size", plainName: "Size", type: "integer", required: true }],
            features: ["page"],
        },
        async *records(params: SizeParams, ctx) {
            for (let page = Number(ctx.cursor?.page ?? 0); page < 2; page++) {
                yield await Promise.resolve({
                    ...pathRows(params.size, `page${String(page)}-`),
                    next: page < 1 ? { page: page + 1 } : null,
                });
            }
        },
    }),
);

/**
 * A fresh session, strict state off as a consumer's is.
 * @returns The session.
 */
function fresh(): GraphSession {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const strict = scope.__GRAPHTY_STRICT_STATE__;
    scope.__GRAPHTY_STRICT_STATE__ = false;
    try {
        return createGraphSession();
    } finally {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    }
}

/**
 * A session holding a path of `size` nodes loaded from `scaling-path`.
 * @param size - The node count.
 * @returns The session.
 */
async function loaded(size: number): Promise<GraphSession> {
    const session = fresh();
    await session.data.import({ source: "scaling-path", config: { size } });
    assert.strictEqual(session.data.snapshot().nodeCount, size);
    return session;
}

/** One verb under test. */
interface Case {
    /** `Owner.method`, as the cost-coverage registry spells it. */
    readonly method: string;
    /**
     * Build the state the call needs and return the call and the session it runs on.
     * @param size - The node count.
     * @returns The session, the call to count, and a check run after it.
     */
    prepare(size: number): Promise<{ session: GraphSession; call: () => Promise<unknown>; check: () => void }>;
}

const CASES: readonly Case[] = [
    {
        method: "SessionDataApi.loadSample",
        prepare: (size) => {
            const session = fresh();
            return Promise.resolve({
                session,
                call: () => session.data.loadSample(`scaling-path-${String(size)}`),
                check: () => {
                    assert.strictEqual(session.data.snapshot().nodeCount, size);
                },
            });
        },
    },
    {
        method: "SessionDataApi.more",
        prepare: async (size) => {
            const session = fresh();
            await session.data.import(
                { source: "scaling-pages", config: { size } },
                { limits: { maxNodes: size, onLimit: "stop" } },
            );
            assert.strictEqual(session.data.snapshot().nodeCount, size, "the first page only");
            const [load] = session.data.loads();
            return {
                session,
                call: () => session.data.more({ load: load.key }),
                check: () => {
                    assert.strictEqual(session.data.snapshot().nodeCount, 2 * size, "the second page arrived");
                },
            };
        },
    },
    {
        method: "SessionDataApi.refresh",
        prepare: async (size) => {
            liveName = "before";
            const session = await loaded(size);
            const [load] = session.data.loads();
            // Every node is renamed at the source, so the refresh updates all of them.
            liveName = "after";
            return {
                session,
                call: () => session.data.refresh(load.key),
                check: () => {
                    assert.strictEqual(session.data.node("p0")?.name, "after");
                    assert.strictEqual(session.data.snapshot().nodeCount, size);
                },
            };
        },
    },
    {
        method: "SessionDataApi.expand",
        prepare: async (size) => {
            const session = await loaded(size);
            return {
                session,
                call: () => session.data.expand(["p0"], { limit: size }),
                check: () => {
                    assert.strictEqual(session.data.snapshot().nodeCount, 2 * size, "the neighbors arrived");
                },
            };
        },
    },
    {
        method: "SessionDataApi.collapse",
        prepare: async (size) => {
            const session = await loaded(size);
            await session.data.expand(["p0"], { limit: size });
            assert.strictEqual(session.data.snapshot().nodeCount, 2 * size);
            return {
                session,
                call: () => session.data.collapse("p0"),
                check: () => {
                    assert.strictEqual(session.data.snapshot().nodeCount, size, "what the expansion brought went");
                },
            };
        },
    },
    {
        method: "SessionDataApi.runPendingSourceLoad",
        prepare: async (size) => {
            const source = await loaded(size);
            const { text } = await source.project.save();
            source.dispose();
            const session = fresh();
            await session.project.open(text);
            const [pending] = session.data.pendingSourceLoads();
            assert.isDefined(pending, "the reopened load waits");
            return {
                session,
                call: () => session.data.runPendingSourceLoad(pending.id),
                check: () => {
                    assert.deepEqual(session.data.pendingSourceLoads(), []);
                    assert.strictEqual(session.data.snapshot().nodeCount, size);
                },
            };
        },
    },
];

describe("the session's source verbs do work in proportion to what they read", () => {
    for (const { method, prepare } of CASES) {
        it(`${method}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const { session, call, check } = await prepare(size);
                    try {
                        const visits = await visitsDuring(call);
                        check();
                        return visits;
                    } finally {
                        session.dispose();
                    }
                },
                { sizes: SIZES, counter: `elements visited by ${method}` },
            );
        });
    }
});
