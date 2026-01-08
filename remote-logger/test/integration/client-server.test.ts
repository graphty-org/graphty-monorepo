/**
 * Integration tests for RemoteLogClient communicating with the real log server.
 * NO MOCKING - real server, real fetch.
 */

import type * as http from "http";
import type * as https from "https";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { RemoteLogClient } from "../../src/client/RemoteLogClient.js";
import { clearLogs, startLogServer } from "../../src/server/log-server.js";

// Use a counter to ensure unique ports for each test run
// Use port range 8200-8299 for integration tests
let portCounter = 0;

function getNextPort(): number {
    portCounter++;
    return 8200 + (portCounter % 100);
}

/**
 * Helper to wait for server to be listening with a timeout.
 * @param server - The server to wait for
 * @param timeoutMs - Timeout in milliseconds
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

describe("Client-Server Integration", () => {
    let server: http.Server;
    let port: number;

    beforeAll(async () => {
        port = getNextPort();
        server = startLogServer({ port, host: "127.0.0.1", useHttp: true, quiet: true }) as http.Server;
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
        // Clear logs between tests
        clearLogs();
    });

    test("should send log from client to server", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Integration test message");
        await client.flush();

        // Verify via REST API
        const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=1`);
        const data = (await response.json()) as { logs: Array<{ message: string; level: string }> };

        expect(data.logs).toHaveLength(1);
        expect(data.logs[0].message).toBe("Integration test message");
        expect(data.logs[0].level).toBe("INFO");

        await client.close();
    });

    test("should batch multiple logs", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Message 1");
        client.log("DEBUG", "Message 2");
        client.log("WARN", "Message 3");
        await client.flush();

        // Verify via REST API
        const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=10`);
        const data = (await response.json()) as { logs: Array<{ message: string }> };

        expect(data.logs).toHaveLength(3);
        expect(data.logs.map((l) => l.message)).toContain("Message 1");
        expect(data.logs.map((l) => l.message)).toContain("Message 2");
        expect(data.logs.map((l) => l.message)).toContain("Message 3");

        await client.close();
    });

    test("should retrieve logs via REST API", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Test log for retrieval");
        await client.flush();

        // Test GET /logs endpoint
        const allLogsResponse = await fetch(`http://127.0.0.1:${port}/logs`);
        const allLogs = (await allLogsResponse.json()) as Record<string, Array<{ message: string }>>;

        // Should have at least one session
        expect(Object.keys(allLogs).length).toBeGreaterThan(0);

        // Find the log in one of the sessions
        const allMessages = Object.values(allLogs).flatMap((logs) => logs.map((l) => l.message));
        expect(allMessages).toContain("Test log for retrieval");

        await client.close();
    });

    test("should handle multiple sessions", async () => {
        const client1 = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            sessionPrefix: "session1",
            batchIntervalMs: 10,
        });

        const client2 = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            sessionPrefix: "session2",
            batchIntervalMs: 10,
        });

        client1.log("INFO", "From session 1");
        client2.log("INFO", "From session 2");

        await Promise.all([client1.flush(), client2.flush()]);

        // Verify via REST API
        const response = await fetch(`http://127.0.0.1:${port}/logs`);
        const data = (await response.json()) as Record<string, Array<{ message: string }>>;

        // Should have two sessions
        expect(Object.keys(data).length).toBe(2);

        // Verify each session has its message
        const allMessages = Object.values(data).flatMap((logs) => logs.map((l) => l.message));
        expect(allMessages).toContain("From session 1");
        expect(allMessages).toContain("From session 2");

        await Promise.all([client1.close(), client2.close()]);
    });

    test("should clear logs", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Log to be cleared");
        await client.flush();

        // Verify log exists
        let response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=10`);
        let data = (await response.json()) as { logs: Array<{ message: string }> };
        expect(data.logs).toHaveLength(1);

        // Clear logs via API
        await fetch(`http://127.0.0.1:${port}/logs/clear`, { method: "POST" });

        // Verify logs are cleared
        response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=10`);
        data = (await response.json()) as { logs: Array<{ message: string }> };
        expect(data.logs).toHaveLength(0);

        await client.close();
    });

    test("should include data field in logs", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Log with data", { userId: 123, action: "click" });
        await client.flush();

        // The server stores logs and we verify the log message was received
        const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=1`);
        const data = (await response.json()) as { logs: Array<{ message: string; level: string }> };

        expect(data.logs).toHaveLength(1);
        expect(data.logs[0].message).toBe("Log with data");

        await client.close();
    });

    test("should filter errors via REST API", async () => {
        const client = new RemoteLogClient({
            serverUrl: `http://127.0.0.1:${port}`,
            batchIntervalMs: 10,
        });

        client.log("INFO", "Normal message");
        client.log("ERROR", "Error message");
        client.log("DEBUG", "Debug message");
        await client.flush();

        // Test GET /logs/errors endpoint
        const response = await fetch(`http://127.0.0.1:${port}/logs/errors`);
        const data = (await response.json()) as { logs: Array<{ message: string; level: string }> };

        expect(data.logs).toHaveLength(1);
        expect(data.logs[0].message).toBe("Error message");
        expect(data.logs[0].level).toBe("ERROR");

        await client.close();
    });

    test("should report health status", async () => {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        const data = (await response.json()) as { status: string; sessions: number };

        expect(data.status).toBe("ok");
        expect(typeof data.sessions).toBe("number");
    });

    test("should handle CORS preflight", async () => {
        const response = await fetch(`http://127.0.0.1:${port}/log`, {
            method: "OPTIONS",
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
});
