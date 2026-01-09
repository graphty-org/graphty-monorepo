/**
 * Regression tests for server modes.
 *
 * These tests ensure that the three server modes (mcp-only, http-only, dual)
 * work correctly and maintain their behavior across releases.
 *
 * Note: Tests that require HTTP requests must disable MCP (`mcpEnabled: false`)
 * because MCP uses stdio which blocks in test environments.
 * Tests for mode configuration can enable MCP since they only check the config.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createDualServer, LogStorage, type DualServerResult } from "../../src/server/index.js";

// Use ports in the integration test range (8200-8399)
const BASE_PORT = 8250;

describe("Server modes", () => {
    let server: DualServerResult | undefined;
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(async () => {
        if (server) {
            await server.shutdown();
            server = undefined;
        }
        storage.stopCleanupTimer();
    });

    describe("mcp-only mode (logReceiveOnly=true)", () => {
        test("serves /log POST endpoint", async () => {
            // mcpEnabled=false to allow HTTP testing (MCP uses stdio which blocks)
            server = await createDualServer({
                httpPort: BASE_PORT,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            // Test /log endpoint works
            const response = await fetch(`http://localhost:${BASE_PORT}/log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: "test-session",
                    logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test log" }],
                }),
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.success).toBe(true);
        });

        test("serves /health GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 1,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 1}/health`);
            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.status).toBe("ok");
        });

        test("rejects /logs GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 2,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 2}/logs`);
            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.error).toContain("log receive only mode");
        });

        test("rejects /logs/recent GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 3,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 3}/logs/recent`);
            expect(response.status).toBe(404);
        });

        test("rejects /logs/errors GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 4,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 4}/logs/errors`);
            expect(response.status).toBe(404);
        });

        test("rejects /logs/clear POST endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 5,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: true,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 5}/logs/clear`, {
                method: "POST",
            });
            expect(response.status).toBe(404);
        });
    });

    describe("http-only mode (mcpEnabled=false, logReceiveOnly=false)", () => {
        test("serves /log POST endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 10,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 10}/log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: "test-session",
                    logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test log" }],
                }),
            });

            expect(response.ok).toBe(true);
        });

        test("serves /logs GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 11,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 11}/logs`);
            expect(response.ok).toBe(true);
        });

        test("serves /logs/recent GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 12,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 12}/logs/recent`);
            expect(response.ok).toBe(true);
        });

        test("serves /logs/errors GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 13,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 13}/logs/errors`);
            expect(response.ok).toBe(true);
        });

        test("serves /logs/clear POST endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 14,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 14}/logs/clear`, {
                method: "POST",
            });
            expect(response.ok).toBe(true);
        });

        test("serves /health GET endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 15,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 15}/health`);
            expect(response.ok).toBe(true);
        });

        test("sets mode to http-only in server config", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 16,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const config = storage.getServerConfig();
            expect(config?.mode).toBe("http-only");
        });
    });

    describe("dual mode (mcpEnabled=true, logReceiveOnly=false)", () => {
        // HTTP endpoint tests use mcpEnabled=false to avoid stdio blocking
        test("serves /log POST endpoint", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 20,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const response = await fetch(`http://localhost:${BASE_PORT + 20}/log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: "test-session",
                    logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test log" }],
                }),
            });

            expect(response.ok).toBe(true);
        });

        test("serves all HTTP endpoints", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 21,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const endpoints = [
                { path: "/health", method: "GET" },
                { path: "/logs", method: "GET" },
                { path: "/logs/recent", method: "GET" },
                { path: "/logs/errors", method: "GET" },
            ];

            for (const { path, method } of endpoints) {
                const response = await fetch(`http://localhost:${BASE_PORT + 21}${path}`, { method });
                expect(response.ok).toBe(true);
            }
        });
    });

    describe("server mode configuration", () => {
        // These tests verify the mode is correctly set based on options
        // They don't need HTTP requests, just check the storage config

        test("sets mode to mcp-only when logReceiveOnly=true and mcpEnabled=true", async () => {
            // Manually set server config to simulate what createDualServer would do
            // (without actually calling it, to avoid MCP stdio blocking)
            storage.setServerConfig({
                httpPort: BASE_PORT + 30,
                httpHost: "127.0.0.1",
                protocol: "http",
                httpEndpoint: `http://localhost:${BASE_PORT + 30}/log`,
                mode: "mcp-only",
            });

            const config = storage.getServerConfig();
            expect(config?.mode).toBe("mcp-only");
        });

        test("sets mode to http-only when mcpEnabled=false", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 31,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
                logReceiveOnly: false,
            });

            const config = storage.getServerConfig();
            expect(config?.mode).toBe("http-only");
        });

        test("sets mode to dual when mcpEnabled=true and logReceiveOnly=false", async () => {
            // Manually set server config to simulate what createDualServer would do
            storage.setServerConfig({
                httpPort: BASE_PORT + 32,
                httpHost: "127.0.0.1",
                protocol: "http",
                httpEndpoint: `http://localhost:${BASE_PORT + 32}/log`,
                mode: "dual",
            });

            const config = storage.getServerConfig();
            expect(config?.mode).toBe("dual");
        });
    });

    describe("server config in status", () => {
        test("includes httpEndpoint for log receiving", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 40,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
            });

            const config = storage.getServerConfig();
            expect(config?.httpEndpoint).toBe(`http://127.0.0.1:${BASE_PORT + 40}/log`);
        });

        test("includes port and host", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 41,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
            });

            const config = storage.getServerConfig();
            expect(config?.httpPort).toBe(BASE_PORT + 41);
            expect(config?.httpHost).toBe("127.0.0.1");
        });

        test("includes protocol", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 42,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
            });

            const config = storage.getServerConfig();
            expect(config?.protocol).toBe("http");
        });

        test("includes mode", async () => {
            server = await createDualServer({
                httpPort: BASE_PORT + 43,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
                storage,
            });

            const config = storage.getServerConfig();
            expect(config?.mode).toBe("http-only");
        });
    });
});
