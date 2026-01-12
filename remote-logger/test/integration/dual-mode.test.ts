/**
 * Integration tests for dual mode (HTTP + MCP).
 *
 * Tests that both HTTP and MCP interfaces can run simultaneously,
 * sharing the same log storage instance.
 */

import * as http from "http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMcpServer } from "../../src/mcp/mcp-server.js";
import { LogStorage } from "../../src/server/log-storage.js";
import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";

describe("Dual mode (HTTP + MCP)", () => {
    let dualServer: DualServerResult;
    let port: number;

    beforeEach(async () => {
        port = 8400 + Math.floor(Math.random() * 100);
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
        }
    });

    /**
     * Helper to send a log via HTTP POST.
     */
    async function sendLogViaHttp(
        sessionId: string,
        logs: Array<{ time: string; level: string; message: string }>,
        projectMarker?: string,
    ): Promise<void> {
        const body = JSON.stringify({
            sessionId,
            logs,
            projectMarker,
        });

        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: "127.0.0.1",
                    port,
                    path: "/log",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                },
            );

            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }

    /**
     * Helper to query logs via HTTP GET.
     */
    async function getLogsViaHttp(): Promise<Record<string, unknown[]>> {
        return new Promise((resolve, reject) => {
            const req = http.request(
                {
                    hostname: "127.0.0.1",
                    port,
                    path: "/logs",
                    method: "GET",
                },
                (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        if (res.statusCode === 200) {
                            resolve(JSON.parse(data) as Record<string, unknown[]>);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                },
            );

            req.on("error", reject);
            req.end();
        });
    }

    it("starts both interfaces from single process", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            quiet: true,
        });

        // Verify HTTP server is running
        expect(dualServer.httpServer).toBeDefined();
        expect(dualServer.httpServer).toBeInstanceOf(http.Server);
        expect(dualServer.httpServer?.listening).toBe(true);

        // Verify MCP server is created
        expect(dualServer.mcpServer).toBeDefined();

        // Verify storage is shared
        expect(dualServer.storage).toBeInstanceOf(LogStorage);
    });

    it("defaults to 0.0.0.0 host for remote accessibility", async () => {
        // This is a regression test to ensure the server binds to all interfaces by default.
        // A remote logging server that binds to localhost is useless for remote connections.
        dualServer = await createDualServer({
            httpPort: port,
            // httpHost intentionally omitted to test default
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        expect(dualServer.httpServer).toBeDefined();
        const address = dualServer.httpServer?.address();
        expect(address).toBeTruthy();
        if (typeof address === "object" && address) {
            expect(address.address).toBe("0.0.0.0");
        }
    });

    it("reports routable address in httpEndpoint when bound to 0.0.0.0", async () => {
        // When the server binds to 0.0.0.0, the reported httpEndpoint should use
        // a routable address (IP or hostname) since 0.0.0.0 is not routable for clients.
        dualServer = await createDualServer({
            httpPort: port,
            // httpHost intentionally omitted to use default 0.0.0.0
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        const status = dualServer.storage.getStatus();
        // Server should bind to 0.0.0.0
        expect(status.server?.httpHost).toBe("0.0.0.0");
        // Endpoint should NOT use 0.0.0.0 - should be a routable address
        expect(status.server?.httpEndpoint).not.toContain("0.0.0.0");
        // Should be a valid URL with the correct port
        expect(status.server?.httpEndpoint).toMatch(new RegExp(`^http://[^:]+:${port}/log$`));
    });

    it("HTTP logs appear in MCP queries", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            quiet: true,
        });

        // Send log via HTTP
        await sendLogViaHttp("browser-session-123", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "From browser via HTTP" },
        ], "my-project");

        // Query storage directly (simulates what MCP tools do)
        const sessions = dualServer.storage.getSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].sessionId).toBe("browser-session-123");
        expect(sessions[0].projectMarker).toBe("my-project");

        const logs = dualServer.storage.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].message).toBe("From browser via HTTP");
    });

    it("logs are shared between interfaces", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            quiet: true,
        });

        // Add log directly to storage (simulates MCP logs_receive)
        dualServer.storage.addLogs("mcp-session-456", [
            { time: "2024-01-15T10:00:00Z", level: "DEBUG", message: "From MCP" },
        ], { projectMarker: "mcp-project" });

        // Query via HTTP
        const httpLogs = await getLogsViaHttp();
        expect(Object.keys(httpLogs)).toContain("mcp-session-456");
        expect(httpLogs["mcp-session-456"]).toHaveLength(1);
    });

    it("graceful shutdown closes both interfaces", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            quiet: true,
        });

        // Verify servers are running
        expect(dualServer.httpServer?.listening).toBe(true);

        // Shutdown
        await dualServer.shutdown();

        // Verify HTTP server is closed
        expect(dualServer.httpServer?.listening).toBe(false);
    });

    it("HTTP-only mode starts only HTTP server", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        expect(dualServer.httpServer).toBeDefined();
        expect(dualServer.httpServer?.listening).toBe(true);
        expect(dualServer.mcpServer).toBeUndefined();
    });

    it("MCP-only mode starts only MCP server", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: false,
            mcpEnabled: true,
            quiet: true,
        });

        expect(dualServer.httpServer).toBeUndefined();
        expect(dualServer.mcpServer).toBeDefined();
    });

    it("default options start both servers", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            quiet: true,
        });

        // Default should be both enabled
        expect(dualServer.httpServer).toBeDefined();
        expect(dualServer.mcpServer).toBeDefined();
    });

    it("configures HTTP port correctly", async () => {
        const customPort = 8450 + Math.floor(Math.random() * 50);
        dualServer = await createDualServer({
            httpPort: customPort,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: false,
            quiet: true,
        });

        // Update port for helper functions
        port = customPort;

        // Send log to custom port
        await sendLogViaHttp("test-session", [
            { time: new Date().toISOString(), level: "INFO", message: "Test message" },
        ]);

        const logs = dualServer.storage.getLogs();
        expect(logs).toHaveLength(1);
    });

    it("storage survives multiple HTTP requests", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
            quiet: true,
        });

        // Send multiple requests
        for (let i = 0; i < 5; i++) {
            await sendLogViaHttp(`session-${i}`, [
                { time: new Date().toISOString(), level: "INFO", message: `Log ${i}` },
            ]);
        }

        // Verify all stored
        const sessions = dualServer.storage.getSessions();
        expect(sessions).toHaveLength(5);

        const logs = dualServer.storage.getLogs();
        expect(logs).toHaveLength(5);
    });
});
