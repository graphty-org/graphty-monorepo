import { afterEach, assert, describe, test, vi } from "vitest";

import { GraphMLDataSource } from "../../src/data/GraphMLDataSource.js";
import { GraphtyError } from "../../src/errors/GraphtyError.js";

const GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="undirected"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph>
</graphml>`;

describe("Network retry behavior", () => {
    describe("with a stubbed fetch", () => {
        afterEach(() => {
            vi.useRealTimers();
            vi.unstubAllGlobals();
        });

        /**
         * Stub fetch to answer with each status in turn, and count the requests.
         * @param statuses - The status of each successive response, or "offline" for a
         *   request that fails at the network level
         * @returns The mock, whose calls are the requests made
         */
        function stubFetch(...statuses: (number | "offline")[]): ReturnType<typeof vi.fn> {
            let call = 0;
            const mock = vi.fn(() => {
                const status = statuses[Math.min(call++, statuses.length - 1)];
                if (status === "offline") {
                    // What fetch does when DNS or the connection fails: it rejects with a TypeError.
                    return Promise.reject(new TypeError("fetch failed"));
                }

                return Promise.resolve(new Response(status === 200 ? GRAPHML : "", { status }));
            });
            vi.stubGlobal("fetch", mock);
            return mock;
        }

        /**
         * Drain a source's chunks, advancing fake timers so the retry backoff runs at once.
         * @param source - The data source to read
         * @returns The error the read rejected with, or undefined when it succeeded
         */
        async function drain(source: GraphMLDataSource): Promise<unknown> {
            const chunks: unknown[] = [];
            const run = (async () => {
                for await (const chunk of source.getData()) {
                    chunks.push(chunk);
                }
            })().then(
                () => undefined,
                (error: unknown) => error,
            );
            await vi.runAllTimersAsync();
            return await run;
        }

        test("a 404 fails after one request and is not recoverable", async () => {
            vi.useFakeTimers();
            const fetchMock = stubFetch(404);
            const error = await drain(new GraphMLDataSource({ url: "https://example.test/missing.xml" }));

            assert.strictEqual(fetchMock.mock.calls.length, 1);
            assert.instanceOf(error, GraphtyError);
            const coded = error;
            assert.strictEqual(coded.code, "E_FETCH_FAILED");
            assert.isFalse(coded.recoverable);
            assert.strictEqual((coded.details as { status?: number }).status, 404);
            assert.include(coded.message, "404");
        });

        test("a 503 followed by a 200 succeeds on the second request", async () => {
            vi.useFakeTimers();
            const fetchMock = stubFetch(503, 200);
            const error = await drain(new GraphMLDataSource({ url: "https://example.test/data.xml" }));

            assert.isUndefined(error);
            assert.strictEqual(fetchMock.mock.calls.length, 2);
        });

        test("a 429 is retried, and the last failure stays recoverable", async () => {
            vi.useFakeTimers();
            const fetchMock = stubFetch(429);
            const error = await drain(new GraphMLDataSource({ url: "https://example.test/data.xml" }));

            assert.strictEqual(fetchMock.mock.calls.length, 3);
            assert.instanceOf(error, GraphtyError);
            assert.isTrue((error).recoverable);
            assert.strictEqual(((error).details as { status?: number }).status, 429);
        });

        test("a network failure is retried and fails after 3 attempts", async () => {
            vi.useFakeTimers();
            const fetchMock = stubFetch("offline");
            const error = await drain(new GraphMLDataSource({ url: "https://example.test/data.xml" }));

            assert.strictEqual(fetchMock.mock.calls.length, 3);
            assert.instanceOf(error, GraphtyError);
            assert.include(error.message, "after 3 attempts");
        });

        test("two network failures then a 200 succeed on the third request", async () => {
            vi.useFakeTimers();
            const fetchMock = stubFetch("offline", "offline", 200);
            const error = await drain(new GraphMLDataSource({ url: "https://example.test/data.xml" }));

            assert.isUndefined(error);
            assert.strictEqual(fetchMock.mock.calls.length, 3);
        });
    });
});
