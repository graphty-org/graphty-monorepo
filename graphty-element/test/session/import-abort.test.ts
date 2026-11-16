/**
 * @file `session.data.import()` honors its signal for inline data, a file and a URL (#7914):
 * aborting it before the load starts, while the file is read or the URL fetched, or between two
 * chunks rejects with the caller's own reason and leaves the graph and the history as they were.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

const START = JSON.stringify({ nodes: [{ id: "x" }, { id: "y" }], edges: [{ source: "x", target: "y" }] });
const BIG = JSON.stringify({
    nodes: Array.from({ length: 50 }, (_, index) => ({ id: `n${String(index)}` })),
    edges: [],
});

/**
 * A session holding a small graph, and what it holds: the graph a refused import must leave.
 * @returns The session and its node count and history length.
 */
async function started(): Promise<{ session: GraphSession; nodes: number; steps: number }> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: START } });
    return { session, nodes: session.data.statistics().nodeCount, steps: session.history.steps.length };
}

/**
 * What a promise rejected with.
 * @param promise - The import.
 * @returns The rejection, or the string "resolved".
 */
function rejection(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => "resolved",
        (error: unknown) => error,
    );
}

/**
 * Check the import rejected with the reason and left the graph and the history unchanged.
 * @param thrown - What it rejected with.
 * @param reason - The caller's reason.
 * @param before - The session and what it held before.
 * @param before.session - The session.
 * @param before.nodes - Its node count before.
 * @param before.steps - Its history length before.
 */
function assertUnchanged(
    thrown: unknown,
    reason: unknown,
    before: { session: GraphSession; nodes: number; steps: number },
): void {
    assert.strictEqual(thrown, reason, "the caller's own reason");
    assert.strictEqual(before.session.data.statistics().nodeCount, before.nodes, "no half-loaded graph");
    assert.strictEqual(before.session.history.steps.length, before.steps, "no undo step");
}

const KINDS = {
    "inline data": () => ({ type: "json", config: { data: BIG } }),
    file: () => ({ type: "json", config: { file: new File([BIG], "big.json") } }),
    URL: () => ({ type: "json", config: { url: "https://example.test/big.json" } }),
};

describe("data.import() honours its abort signal (#7914)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    for (const [kind, source] of Object.entries(KINDS)) {
        it(`reads nothing from ${kind} when aborted before it starts`, async () => {
            let fetched = 0;
            vi.stubGlobal("fetch", () => {
                fetched++;
                return Promise.resolve(new Response(BIG));
            });
            const before = await started();
            const reason = new DOMException("The reader cancelled.", "AbortError");

            const thrown = await rejection(before.session.data.import(source(), { signal: AbortSignal.abort(reason) }));

            assertUnchanged(thrown, reason, before);
            assert.strictEqual(fetched, 0, "nothing fetched");
            before.session.dispose();
        });
    }

    it("stops inline data between two chunks", async () => {
        const before = await started();
        const abort = new AbortController();
        const reason = new DOMException("Enough.", "AbortError");
        let chunks = 0;
        before.session.on("progress:changed", (change) => {
            if (change.task === "load" && change.phase === "progress" && change.completed > 0) {
                chunks++;
                abort.abort(reason);
            }
        });

        const thrown = await rejection(
            before.session.data.import({ type: "json", config: { data: BIG, chunkSize: 1 } }, { signal: abort.signal }),
        );

        assertUnchanged(thrown, reason, before);
        assert.strictEqual(chunks, 1, "no chunk read after the abort");
        before.session.dispose();
    });

    it("stops while the file is being read", async () => {
        const before = await started();
        const abort = new AbortController();
        const reason = new DOMException("Enough.", "AbortError");
        const file = new File([BIG], "big.json");
        let reads = 0;
        file.arrayBuffer = (): Promise<ArrayBuffer> => {
            reads++;
            abort.abort(reason);
            return new Blob([BIG]).arrayBuffer();
        };

        const thrown = await rejection(
            before.session.data.import({ type: "json", config: { file } }, { signal: abort.signal }),
        );

        assertUnchanged(thrown, reason, before);
        assert.strictEqual(reads, 1);
        before.session.dispose();
    });

    for (const named of [true, false]) {
        it(`cancels the request of a URL ${named ? "whose format is named" : "fetched to detect its format"}`, async () => {
            const before = await started();
            const abort = new AbortController();
            const reason = new DOMException("Enough.", "AbortError");
            let requests = 0;
            vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
                requests++;
                const { signal } = init ?? {};
                abort.abort(reason);
                return signal?.aborted === true
                    ? Promise.reject(new DOMException("The request was aborted.", "AbortError"))
                    : Promise.resolve(new Response(BIG));
            });

            const url = "https://example.test/graph";
            const thrown = await rejection(
                before.session.data.import(named ? { type: "json", config: { url } } : { config: { url } }, {
                    signal: abort.signal,
                }),
            );

            assertUnchanged(thrown, reason, before);
            assert.strictEqual(requests, 1, "the request is cancelled, not retried");
            before.session.dispose();
        });
    }
});
