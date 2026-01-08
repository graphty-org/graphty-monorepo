/**
 * Tests for port scanning functionality.
 *
 * Verifies that the server can automatically find available ports
 * when the requested port is already in use.
 */

import * as http from "http";
import * as net from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDualServer, findAvailablePort, type DualServerResult } from "../../src/server/dual-server.js";

describe("Port scanning", () => {
    let dualServer: DualServerResult | undefined;
    let blockingServers: net.Server[] = [];
    const basePort = 8600;

    beforeEach(() => {
        blockingServers = [];
    });

    afterEach(async () => {
        // Shutdown dual server if created
        if (dualServer) {
            await dualServer.shutdown();
            dualServer = undefined;
        }

        // Close all blocking servers
        for (const server of blockingServers) {
            await new Promise<void>((resolve) => {
                server.close(() => { resolve(); });
            });
        }
        blockingServers = [];
    });

    /**
     * Helper to create a server that blocks a specific port.
     */
    function createBlockingServer(port: number, host: string = "127.0.0.1"): Promise<net.Server> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.on("error", reject);
            server.listen(port, host, () => {
                blockingServers.push(server);
                resolve(server);
            });
        });
    }

    describe("findAvailablePort", () => {
        it("returns requested port when available", async () => {
            const port = await findAvailablePort(basePort, "127.0.0.1", true);
            expect(port).toBe(basePort);
        });

        it("finds next available port when requested port is in use", async () => {
            // Block the base port
            await createBlockingServer(basePort);

            const port = await findAvailablePort(basePort, "127.0.0.1", true);
            expect(port).toBe(basePort + 1);
        });

        it("skips multiple blocked ports", async () => {
            // Block first 3 ports
            await createBlockingServer(basePort);
            await createBlockingServer(basePort + 1);
            await createBlockingServer(basePort + 2);

            const port = await findAvailablePort(basePort, "127.0.0.1", true);
            expect(port).toBe(basePort + 3);
        });

        it("logs message when port is not available (quiet=false)", async () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

            // Block the base port
            await createBlockingServer(basePort + 10);

            const port = await findAvailablePort(basePort + 10, "127.0.0.1", false);

            // Should log about scanning
            expect(consoleSpy).toHaveBeenCalled();
            const calls = consoleSpy.mock.calls.flat().join(" ");
            expect(calls).toContain("already in use");

            // Should still find the next port
            expect(port).toBe(basePort + 11);

            consoleSpy.mockRestore();
        });

        it("throws error when max attempts exceeded", async () => {
            // Block 100 consecutive ports starting from a high base
            // Use a port range that won't conflict with other tests
            const highBase = 9000;
            for (let i = 0; i < 100; i++) {
                try {
                    await createBlockingServer(highBase + i);
                } catch {
                    // Port might already be in use by something else
                }
            }

            // Should throw because we can't find an available port
            // within MAX_PORT_SCAN_ATTEMPTS (100)
            await expect(findAvailablePort(highBase, "127.0.0.1", true))
                .rejects.toThrow(/Could not find available port/);
        });
    });

    describe("createDualServer with port scanning", () => {
        it("uses requested port when available", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 50,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
            });

            expect(dualServer.httpPort).toBe(basePort + 50);
            expect(dualServer.httpServer?.listening).toBe(true);
        });

        it("automatically finds next port when requested port is blocked", async () => {
            // Block the requested port
            await createBlockingServer(basePort + 60);

            dualServer = await createDualServer({
                httpPort: basePort + 60,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
            });

            // Should have found the next available port
            expect(dualServer.httpPort).toBe(basePort + 61);
            expect(dualServer.httpServer?.listening).toBe(true);
        });

        it("server config reflects actual port used", async () => {
            // Block the requested port
            await createBlockingServer(basePort + 70);

            dualServer = await createDualServer({
                httpPort: basePort + 70,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
            });

            // Storage should have the actual port in config
            const config = dualServer.storage.getServerConfig();
            expect(config?.httpPort).toBe(basePort + 71);
            expect(config?.httpEndpoint).toContain(`${basePort + 71}`);
        });

        it("HTTP endpoint works on auto-selected port", async () => {
            // Block the requested port
            await createBlockingServer(basePort + 80);

            dualServer = await createDualServer({
                httpPort: basePort + 80,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: true,
            });

            const actualPort = dualServer.httpPort!;

            // Send a log to the actual port
            const body = JSON.stringify({
                sessionId: "test-session",
                logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test" }],
            });

            await new Promise<void>((resolve, reject) => {
                const req = http.request(
                    {
                        hostname: "127.0.0.1",
                        port: actualPort,
                        path: "/log",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Content-Length": Buffer.byteLength(body),
                        },
                    },
                    (res) => {
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    },
                );
                req.on("error", reject);
                req.write(body);
                req.end();
            });

            // Verify log was received
            const logs = dualServer.storage.getLogs();
            expect(logs).toHaveLength(1);
        });

        it("logs informative message when port is changed", async () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

            // Block the requested port
            await createBlockingServer(basePort + 90);

            dualServer = await createDualServer({
                httpPort: basePort + 90,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                                quiet: false, // Enable logging
            });

            // Should log about port change
            const calls = consoleSpy.mock.calls.flat().join(" ");
            expect(calls).toContain(`${basePort + 90}`);
            expect(calls).toContain("in use");

            consoleSpy.mockRestore();
        });

        it("returns undefined httpPort when HTTP is disabled", async () => {
            dualServer = await createDualServer({
                httpEnabled: false,
                mcpEnabled: true,
                quiet: true,
            });

            expect(dualServer.httpPort).toBeUndefined();
            expect(dualServer.httpServer).toBeUndefined();
        });
    });
});
