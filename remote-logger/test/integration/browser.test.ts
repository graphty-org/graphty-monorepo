/**
 * Browser integration tests for RemoteLogClient.
 * Tests browser-specific behavior like unique sessions per page and flush on close.
 *
 * Note: Full browser-to-server E2E tests require a test page hosted in a browser.
 * These tests verify the browser-side behavior of the RemoteLogClient.
 * The client-server.test.ts file covers the actual HTTP communication.
 */

import type * as http from "http";
import type * as https from "https";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { createRemoteLogClient, RemoteLogClient } from "../../src/client/RemoteLogClient.js";
import { clearLogs, startLogServer } from "../../src/server/log-server.js";

// Use a counter to ensure unique ports for each test run
// Use port range 8300-8399 for browser integration tests
let portCounter = 0;

function getNextPort(): number {
    portCounter++;
    return 8300 + (portCounter % 100);
}

/**
 * Helper to wait for server to be listening with a timeout.
 */
async function waitForServer(server: http.Server | https.Server, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Server did not start within ${timeoutMs}ms`));
        }, timeoutMs);

        server.once("listening", () => {
            clearTimeout(timeout);
            resolve();
        });

        server.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

describe("Browser Integration Tests", () => {
    let server: http.Server;
    let port: number;

    beforeAll(async () => {
        port = getNextPort();
        server = startLogServer({ port, host: "127.0.0.1", quiet: true }) as http.Server;
        await waitForServer(server);
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            server.close(() => {
                resolve();
            });
        });
    });

    afterEach(() => {
        clearLogs();
    });

    describe("session management", () => {
        test("should generate unique session per page/client instance", async () => {
            // Simulates creating clients on different pages
            const client1 = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10,
            });

            const client2 = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10,
            });

            // Each client should have a unique session ID
            expect(client1.sessionId).not.toBe(client2.sessionId);

            client1.log("INFO", "From page 1");
            client2.log("INFO", "From page 2");

            await Promise.all([client1.flush(), client2.flush()]);

            // Verify both sessions exist on server
            const response = await fetch(`http://127.0.0.1:${port}/logs`);
            const data = (await response.json()) as Record<string, unknown[]>;

            expect(Object.keys(data)).toContain(client1.sessionId);
            expect(Object.keys(data)).toContain(client2.sessionId);

            await Promise.all([client1.close(), client2.close()]);
        });

        test("should use custom session prefix for identification", async () => {
            const client = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                sessionPrefix: "graphty-element",
                batchIntervalMs: 10,
            });

            expect(client.sessionId).toMatch(/^graphty-element-/);

            client.log("INFO", "Test message");
            await client.flush();

            // Verify session exists on server with correct prefix
            const response = await fetch(`http://127.0.0.1:${port}/logs`);
            const data = (await response.json()) as Record<string, unknown[]>;

            const sessionKeys = Object.keys(data);
            expect(sessionKeys.some((k) => k.startsWith("graphty-element-"))).toBe(true);

            await client.close();
        });
    });

    describe("flush behavior", () => {
        test("should flush logs before close (simulating page unload)", async () => {
            const client = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10000, // Very long batch interval
            });

            client.log("INFO", "Message before close");

            // Close should flush pending logs
            await client.close();

            // Verify log was sent even though batch interval hadn't expired
            const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=1`);
            const data = (await response.json()) as { logs: Array<{ message: string }> };

            expect(data.logs).toHaveLength(1);
            expect(data.logs[0].message).toBe("Message before close");
        });

        test("should not accept logs after close", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const client = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10,
            });

            await client.close();

            // Try to log after close - should be silently ignored
            client.log("INFO", "Message after close");
            await client.flush();

            // Verify no logs on server
            const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=10`);
            const data = (await response.json()) as { logs: unknown[] };

            expect(data.logs).toHaveLength(0);

            consoleErrorSpy.mockRestore();
        });
    });

    describe("factory function", () => {
        test("createRemoteLogClient should work identically to constructor", async () => {
            const client = createRemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                sessionPrefix: "factory-test",
                batchIntervalMs: 10,
            });

            expect(client.sessionId).toMatch(/^factory-test-/);

            client.log("INFO", "Created via factory");
            await client.flush();

            const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=1`);
            const data = (await response.json()) as { logs: Array<{ message: string }> };

            expect(data.logs[0].message).toBe("Created via factory");

            await client.close();
        });
    });

    describe("multiple log levels", () => {
        test("should handle all log levels from browser", async () => {
            const client = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10,
            });

            client.log("DEBUG", "Debug message");
            client.log("INFO", "Info message");
            client.log("WARN", "Warning message");
            client.log("ERROR", "Error message");
            await client.flush();

            const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=10`);
            const data = (await response.json()) as { logs: Array<{ level: string; message: string }> };

            expect(data.logs).toHaveLength(4);

            const levels = data.logs.map((l) => l.level);
            expect(levels).toContain("DEBUG");
            expect(levels).toContain("INFO");
            expect(levels).toContain("WARN");
            expect(levels).toContain("ERROR");

            await client.close();
        });
    });

    describe("data field handling", () => {
        test("should send logs with additional data from browser", async () => {
            const client = new RemoteLogClient({
                serverUrl: `http://127.0.0.1:${port}`,
                batchIntervalMs: 10,
            });

            client.log("INFO", "User action", {
                source: "browser",
                userAgent: "test-agent",
                pageUrl: "http://example.com/test",
            });
            await client.flush();

            // The server receives the data, though it may not include it in all responses
            const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=1`);
            const data = (await response.json()) as { logs: Array<{ message: string }> };

            expect(data.logs).toHaveLength(1);
            expect(data.logs[0].message).toBe("User action");

            await client.close();
        });
    });
});
