import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from "vitest";

import { createRemoteLogClient, RemoteLogClient } from "../../src/client/RemoteLogClient.js";

describe("RemoteLogClient", () => {
    let fetchSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        // Mock fetch - no real server needed for unit tests
        fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ success: true }), { status: 200 }),
        );
        // Spy on console.error to verify error logging
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("initialization", () => {
        test("should create client with serverUrl", () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
            });

            expect(client.sessionId).toBeDefined();
            expect(client.sessionId).toMatch(/^session-/);
        });

        test("should generate unique session ID", () => {
            const client1 = new RemoteLogClient({ serverUrl: "http://localhost:9080" });
            const client2 = new RemoteLogClient({ serverUrl: "http://localhost:9080" });

            expect(client1.sessionId).not.toBe(client2.sessionId);
        });

        test("should use custom session prefix", () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                sessionPrefix: "myapp",
            });

            expect(client.sessionId).toMatch(/^myapp-/);
        });
    });

    describe("logging", () => {
        test("should add timestamp and format log entry", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            // Set a fixed date for predictable testing
            const testDate = new Date("2024-01-15T10:30:00.000Z");
            vi.setSystemTime(testDate);

            client.log("INFO", "Test message");

            // Advance time to trigger batch send
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs).toHaveLength(1);
            expect(body.logs[0]).toEqual({
                time: "2024-01-15T10:30:00.000Z",
                level: "INFO",
                message: "Test message",
            });
        });

        test("should include data field when provided", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("DEBUG", "User action", { userId: 123, action: "click" });

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs[0].data).toEqual({ userId: 123, action: "click" });
        });

        test("should not include data field when undefined", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Simple message");

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs[0]).not.toHaveProperty("data");
        });

        test("should not log after close", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            await client.close();
            client.log("INFO", "Should be ignored");

            await vi.advanceTimersByTimeAsync(200);

            // Only one call for the flush during close (which has no logs)
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe("batching", () => {
        test("should batch multiple logs before sending", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Message 1");
            client.log("DEBUG", "Message 2");
            client.log("WARN", "Message 3");

            // Before interval expires, no fetch should be made
            expect(fetchSpy).not.toHaveBeenCalled();

            // Advance time to trigger batch
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs).toHaveLength(3);
            expect(body.logs[0].message).toBe("Message 1");
            expect(body.logs[1].message).toBe("Message 2");
            expect(body.logs[2].message).toBe("Message 3");
        });

        test("should send after batch interval", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 500,
            });

            client.log("INFO", "Test");

            // At 400ms, no send yet
            await vi.advanceTimersByTimeAsync(400);
            expect(fetchSpy).not.toHaveBeenCalled();

            // At 500ms, should send
            await vi.advanceTimersByTimeAsync(100);
            expect(fetchSpy).toHaveBeenCalledOnce();
        });

        test("should not reschedule timer if one is pending", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Message 1");
            await vi.advanceTimersByTimeAsync(50);

            client.log("INFO", "Message 2");
            await vi.advanceTimersByTimeAsync(50);

            // Should send both messages in one batch
            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);
            expect(body.logs).toHaveLength(2);
        });

        test("should flush immediately when flush() called", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 10000, // Long interval
            });

            client.log("INFO", "Urgent message");

            // Flush immediately without waiting for timer
            await client.flush();

            expect(fetchSpy).toHaveBeenCalledOnce();
        });

        test("should not send empty batch", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            await client.flush();

            expect(fetchSpy).not.toHaveBeenCalled();
        });

        test("should continue accepting logs after batch send", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "First batch");
            await vi.advanceTimersByTimeAsync(100);

            client.log("INFO", "Second batch");
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe("retry", () => {
        test("should retry on network failure", async () => {
            fetchSpy.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(
                new Response(JSON.stringify({ success: true }), { status: 200 }),
            );

            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                retryDelayMs: 100,
                maxRetries: 3,
            });

            client.log("INFO", "Test message");

            // Advance to trigger initial batch
            await vi.advanceTimersByTimeAsync(100);

            // First attempt fails, wait for retry delay
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledTimes(2);
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        test("should use exponential backoff delay", async () => {
            fetchSpy
                .mockRejectedValueOnce(new Error("Network error"))
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 50,
                retryDelayMs: 100,
                maxRetries: 3,
            });

            client.log("INFO", "Test");

            // Trigger initial batch
            await vi.advanceTimersByTimeAsync(50);
            expect(fetchSpy).toHaveBeenCalledTimes(1);

            // First retry after 100ms (100 * 2^0)
            await vi.advanceTimersByTimeAsync(100);
            expect(fetchSpy).toHaveBeenCalledTimes(2);

            // Second retry after 200ms (100 * 2^1)
            await vi.advanceTimersByTimeAsync(200);
            expect(fetchSpy).toHaveBeenCalledTimes(3);
        });

        test("should give up after max retries", async () => {
            fetchSpy.mockRejectedValue(new Error("Persistent network error"));

            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 50,
                retryDelayMs: 100,
                maxRetries: 2,
            });

            client.log("INFO", "Test");

            // Trigger initial batch
            await vi.advanceTimersByTimeAsync(50);

            // Wait through all retries (100 + 200 = 300ms for delays)
            await vi.advanceTimersByTimeAsync(500);

            // 1 initial + 2 retries = 3 attempts
            expect(fetchSpy).toHaveBeenCalledTimes(3);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "[RemoteLogClient] Failed to send logs after retries:",
                "Persistent network error",
            );
        });

        test("should handle HTTP error responses", async () => {
            fetchSpy.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 50,
                retryDelayMs: 50,
                maxRetries: 1,
            });

            client.log("INFO", "Test");

            await vi.advanceTimersByTimeAsync(200);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe("close", () => {
        test("should flush pending logs on close", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 10000, // Long interval
            });

            client.log("INFO", "Pending message");

            await client.close();

            expect(fetchSpy).toHaveBeenCalledOnce();
        });

        test("should stop batch timer on close", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Message");

            await client.close();

            // First call is from close flush
            expect(fetchSpy).toHaveBeenCalledOnce();

            // After close, timer should not trigger again
            await vi.advanceTimersByTimeAsync(200);
            expect(fetchSpy).toHaveBeenCalledOnce();
        });

        test("should be idempotent", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Message");

            await client.close();
            await client.close();
            await client.close();

            // Should only send once
            expect(fetchSpy).toHaveBeenCalledOnce();
        });
    });

    describe("request format", () => {
        test("should send to correct endpoint", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Test");
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledWith("http://localhost:9080/log", expect.any(Object));
        });

        test("should include sessionId in request body", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Test");
            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.sessionId).toBe(client.sessionId);
        });

        test("should set correct Content-Type header", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Test");
            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];

            expect(options.headers).toEqual({ "Content-Type": "application/json" });
        });
    });

    describe("createRemoteLogClient factory", () => {
        test("should create client with options", () => {
            const client = createRemoteLogClient({
                serverUrl: "http://localhost:9080",
                sessionPrefix: "test",
            });

            expect(client).toBeInstanceOf(RemoteLogClient);
            expect(client.sessionId).toMatch(/^test-/);
        });
    });

    describe("concurrent flush handling", () => {
        test("should wait for in-progress flush before starting new one", async () => {
            // Create a fetch that resolves slowly
            let resolveFirst: () => void;
            const slowPromise = new Promise<Response>((resolve) => {
                resolveFirst = () => resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
            });

            fetchSpy.mockReturnValueOnce(slowPromise).mockResolvedValue(
                new Response(JSON.stringify({ success: true }), { status: 200 }),
            );

            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "First");

            // Start first flush
            const flush1 = client.flush();

            // Add more logs and start second flush
            client.log("INFO", "Second");
            const flush2 = client.flush();

            // Resolve the first request
            resolveFirst!();

            await Promise.all([flush1, flush2]);

            // Both logs should have been sent
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe("throttling", () => {
        test("should throttle messages matching a pattern within the interval", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                throttlePatterns: [{ pattern: /render frame/, intervalMs: 1000 }],
            });

            // First message should go through
            client.log("DEBUG", "render frame 1");

            // These should be throttled (within 1000ms window)
            client.log("DEBUG", "render frame 2");
            client.log("DEBUG", "render frame 3");

            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            // Only the first message should have been sent
            expect(body.logs).toHaveLength(1);
            expect(body.logs[0].message).toBe("render frame 1");
        });

        test("should allow messages after throttle interval expires", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                throttlePatterns: [{ pattern: /render frame/, intervalMs: 500 }],
            });

            // First message at t=0
            client.log("DEBUG", "render frame 1");
            await vi.advanceTimersByTimeAsync(100);

            // Message at t=100 should be throttled
            client.log("DEBUG", "render frame 2");
            await vi.advanceTimersByTimeAsync(100);

            // Advance to t=600 (past the 500ms window)
            await vi.advanceTimersByTimeAsync(400);

            // This message should go through (throttle window expired)
            client.log("DEBUG", "render frame 3");
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledTimes(2);

            // First batch had frame 1
            const body1 = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
            expect(body1.logs).toHaveLength(1);
            expect(body1.logs[0].message).toBe("render frame 1");

            // Second batch had frame 3 (frame 2 was throttled)
            const body2 = JSON.parse((fetchSpy.mock.calls[1] as [string, RequestInit])[1].body as string);
            expect(body2.logs).toHaveLength(1);
            expect(body2.logs[0].message).toBe("render frame 3");
        });

        test("should not throttle non-matching messages", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                throttlePatterns: [{ pattern: /render frame/, intervalMs: 1000 }],
            });

            // These don't match the pattern
            client.log("INFO", "User clicked button");
            client.log("INFO", "User scrolled page");
            client.log("INFO", "User typed text");

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs).toHaveLength(3);
        });

        test("should handle multiple throttle patterns independently", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                throttlePatterns: [
                    { pattern: /render frame/, intervalMs: 1000 },
                    { pattern: /mouse move/, intervalMs: 500 },
                ],
            });

            // First of each pattern should go through
            client.log("DEBUG", "render frame 1");
            client.log("DEBUG", "mouse move at x:10");

            // These should be throttled
            client.log("DEBUG", "render frame 2");
            client.log("DEBUG", "mouse move at x:20");

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs).toHaveLength(2);
            expect(body.logs[0].message).toBe("render frame 1");
            expect(body.logs[1].message).toBe("mouse move at x:10");
        });

        test("should work with no throttle patterns configured", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                // No throttlePatterns - all messages should pass
            });

            client.log("DEBUG", "Message 1");
            client.log("DEBUG", "Message 1"); // Duplicate
            client.log("DEBUG", "Message 1"); // Another duplicate

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.logs).toHaveLength(3);
        });

        test("should use pattern source as key for independent throttling", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                throttlePatterns: [
                    { pattern: /^frame/, intervalMs: 1000 },
                    { pattern: /^mouse/, intervalMs: 1000 },
                ],
            });

            // These match different patterns
            client.log("DEBUG", "frame rendered");
            client.log("DEBUG", "mouse moved"); // Not throttled - matches different pattern

            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            // "frame rendered" matches ^frame
            // "mouse moved" matches ^mouse (different pattern key)
            expect(body.logs).toHaveLength(2);
        });
    });

    describe("project marker support", () => {
        test("should send projectMarker with logs when configured", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                projectMarker: "my-project",
            });

            client.log("INFO", "Test message");
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.projectMarker).toBe("my-project");
        });

        test("should send worktreePath with logs when configured", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                worktreePath: "/home/user/.worktrees/remote-logging",
            });

            client.log("INFO", "Test message");
            await vi.advanceTimersByTimeAsync(100);

            expect(fetchSpy).toHaveBeenCalledOnce();
            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.worktreePath).toBe("/home/user/.worktrees/remote-logging");
        });

        test("should send both projectMarker and worktreePath when configured", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
                projectMarker: "my-project",
                worktreePath: "/home/user/.worktrees/remote-logging",
            });

            client.log("INFO", "Test message");
            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body.projectMarker).toBe("my-project");
            expect(body.worktreePath).toBe("/home/user/.worktrees/remote-logging");
        });

        test("should not include projectMarker in request when not configured", async () => {
            const client = new RemoteLogClient({
                serverUrl: "http://localhost:9080",
                batchIntervalMs: 100,
            });

            client.log("INFO", "Test message");
            await vi.advanceTimersByTimeAsync(100);

            const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
            const body = JSON.parse(options.body as string);

            expect(body).not.toHaveProperty("projectMarker");
            expect(body).not.toHaveProperty("worktreePath");
        });

        test("should read __REMOTE_LOG_PROJECT_MARKER__ global if defined", async () => {
            // Define the global
            (globalThis as Record<string, unknown>).__REMOTE_LOG_PROJECT_MARKER__ = "global-marker";

            try {
                const client = new RemoteLogClient({
                    serverUrl: "http://localhost:9080",
                    batchIntervalMs: 100,
                });

                client.log("INFO", "Test message");
                await vi.advanceTimersByTimeAsync(100);

                const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
                const body = JSON.parse(options.body as string);

                expect(body.projectMarker).toBe("global-marker");
            } finally {
                // Clean up
                delete (globalThis as Record<string, unknown>).__REMOTE_LOG_PROJECT_MARKER__;
            }
        });

        test("should read __REMOTE_LOG_WORKTREE_PATH__ global if defined", async () => {
            // Define the global
            (globalThis as Record<string, unknown>).__REMOTE_LOG_WORKTREE_PATH__ = "/path/from/global";

            try {
                const client = new RemoteLogClient({
                    serverUrl: "http://localhost:9080",
                    batchIntervalMs: 100,
                });

                client.log("INFO", "Test message");
                await vi.advanceTimersByTimeAsync(100);

                const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
                const body = JSON.parse(options.body as string);

                expect(body.worktreePath).toBe("/path/from/global");
            } finally {
                // Clean up
                delete (globalThis as Record<string, unknown>).__REMOTE_LOG_WORKTREE_PATH__;
            }
        });

        test("should prefer explicit projectMarker over global", async () => {
            // Define the global
            (globalThis as Record<string, unknown>).__REMOTE_LOG_PROJECT_MARKER__ = "global-marker";

            try {
                const client = new RemoteLogClient({
                    serverUrl: "http://localhost:9080",
                    batchIntervalMs: 100,
                    projectMarker: "explicit-marker",
                });

                client.log("INFO", "Test message");
                await vi.advanceTimersByTimeAsync(100);

                const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
                const body = JSON.parse(options.body as string);

                expect(body.projectMarker).toBe("explicit-marker");
            } finally {
                // Clean up
                delete (globalThis as Record<string, unknown>).__REMOTE_LOG_PROJECT_MARKER__;
            }
        });

        test("should prefer explicit worktreePath over global", async () => {
            // Define the global
            (globalThis as Record<string, unknown>).__REMOTE_LOG_WORKTREE_PATH__ = "/path/from/global";

            try {
                const client = new RemoteLogClient({
                    serverUrl: "http://localhost:9080",
                    batchIntervalMs: 100,
                    worktreePath: "/path/explicit",
                });

                client.log("INFO", "Test message");
                await vi.advanceTimersByTimeAsync(100);

                const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
                const body = JSON.parse(options.body as string);

                expect(body.worktreePath).toBe("/path/explicit");
            } finally {
                // Clean up
                delete (globalThis as Record<string, unknown>).__REMOTE_LOG_WORKTREE_PATH__;
            }
        });
    });
});
