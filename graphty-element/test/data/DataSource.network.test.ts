import { afterEach, assert, describe, test, vi } from "vitest";

import { GraphMLDataSource } from "../../src/data/GraphMLDataSource.js";
import { GraphtyError } from "../../src/errors/GraphtyError.js";

const GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="undirected"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph>
</graphml>`;

describe("Network retry behavior", () => {
    test("retries on network failure", async () => {
        // This test requires a mock server - documenting expected behavior
        // In a real implementation, use MSW (Mock Service Worker) or similar

        // Setup: Mock server that fails twice, succeeds third time
        // Action: Create DataSource with URL
        // Assert: Successfully fetches data after 2 retries

        // For now, we'll test with an invalid URL and verify error message
        const source = new GraphMLDataSource({
            url: "http://invalid-nonexistent-domain-12345.test/data.xml",
        });

        let errorThrown = false;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const chunk of source.getData()) {
                // Should not get here
                assert.fail("Should have thrown an error");
            }
        } catch (error) {
            errorThrown = true;
            assert.include((error as Error).message, "after 3 attempts");
        }

        assert.isTrue(errorThrown, "Should have thrown an error");
    });

    describe("with a stubbed fetch", () => {
        afterEach(() => {
            vi.useRealTimers();
            vi.unstubAllGlobals();
        });

        /**
         * Stub fetch to answer with each status in turn, and count the requests.
         * @param statuses - The status of each successive response
         * @returns The mock, whose calls are the requests made
         */
        function stubFetch(...statuses: number[]): ReturnType<typeof vi.fn> {
            let call = 0;
            const mock = vi.fn(() => {
                const status = statuses[Math.min(call++, statuses.length - 1)];
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
    });
});
