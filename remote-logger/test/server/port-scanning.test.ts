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

    describe("race condition handling", () => {
        it("should retry with next port if EADDRINUSE occurs during listen", async () => {
            // This test simulates a race condition scenario:
            // 1. Port scan finds basePort available
            // 2. Another process claims the port before we can bind
            // 3. Our server should automatically retry with the next port
            //
            // We simulate this by blocking the port after findAvailablePort returns
            // but before the actual HTTP server starts listening

            const testPort = basePort + 100;

            // First, block the port that would be found available
            const blocker = await createBlockingServer(testPort);

            // Create server - it should handle the EADDRINUSE and try next port
            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            // Server should have found the next available port
            expect(dualServer.httpPort).toBeGreaterThan(testPort);
            expect(dualServer.httpServer?.listening).toBe(true);

            // Clean up blocker
            await new Promise<void>((resolve) => {
                blocker.close(() => { resolve(); });
            });
            // Remove from blockingServers array since we closed it manually
            blockingServers = blockingServers.filter(s => s !== blocker);
        });

        it("should handle multiple consecutive ports being claimed during bind", async () => {
            // Block several consecutive ports to ensure retry loop works
            const testPort = basePort + 110;

            await createBlockingServer(testPort);
            await createBlockingServer(testPort + 1);
            await createBlockingServer(testPort + 2);

            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            // Should skip all blocked ports
            expect(dualServer.httpPort).toBe(testPort + 3);
            expect(dualServer.httpServer?.listening).toBe(true);
        });

        it("should log informative message when retrying after race condition", async () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

            const testPort = basePort + 120;

            // Block the port to trigger retry
            await createBlockingServer(testPort);

            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: false, // Enable logging to capture messages
            });

            // Should have logged about port being in use
            const calls = consoleSpy.mock.calls.flat().join(" ");
            expect(calls).toContain("in use");

            consoleSpy.mockRestore();
        });

        it("should update server config with actual port after race condition retry", async () => {
            const testPort = basePort + 130;

            // Block the initially selected port
            await createBlockingServer(testPort);

            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            // Storage config should reflect the actual bound port
            const config = dualServer.storage.getServerConfig();
            expect(config?.httpPort).toBe(testPort + 1);
            expect(config?.httpEndpoint).toContain(`${testPort + 1}`);
        });

        it("should fail gracefully after max retry attempts", async () => {
            // Block 100 consecutive ports to exhaust retries
            // Use a port range starting at 9000 (max allowed range)
            const highBase = 9000;

            // Block all ports from 9000 to 9099 (100 ports)
            const blockers: net.Server[] = [];
            for (let i = 0; i < 100; i++) {
                try {
                    const blocker = await createBlockingServer(highBase + i);
                    blockers.push(blocker);
                } catch {
                    // Port might already be in use by something else
                }
            }

            // Should throw because we can't find an available port
            await expect(createDualServer({
                httpPort: highBase,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            })).rejects.toThrow(/Could not find available port/);

            // Clean up blockers
            for (const blocker of blockers) {
                await new Promise<void>((resolve) => {
                    blocker.close(() => { resolve(); });
                });
            }
            // Remove from blockingServers
            blockingServers = blockingServers.filter(s => !blockers.includes(s));
        });
    });

    describe("configurable max port number", () => {
        it("should respect custom maxPortNumber option", async () => {
            // Block a few ports and set a low max port number
            const testPort = basePort + 300;
            await createBlockingServer(testPort);
            await createBlockingServer(testPort + 1);

            // With maxPortNumber = testPort + 1, it should fail to find a port
            // because we only allow testPort and testPort+1
            await expect(createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                maxPortNumber: testPort + 1,
            })).rejects.toThrow();
        });

        it("should succeed when maxPortNumber allows finding a port", async () => {
            const testPort = basePort + 310;
            await createBlockingServer(testPort);

            // With maxPortNumber = testPort + 2, it should find testPort + 1
            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                maxPortNumber: testPort + 2,
            });

            expect(dualServer.httpPort).toBe(testPort + 1);
        });

        it("should use default MAX_PORT_NUMBER when not specified", async () => {
            // Default behavior: no maxPortNumber option
            const testPort = basePort + 320;

            dualServer = await createDualServer({
                httpPort: testPort,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                // maxPortNumber not specified - should use default 9099
            });

            expect(dualServer.httpPort).toBe(testPort);
        });
    });

    describe("endpoint host resolution", () => {
        it("should use detected internal IP when available", async () => {
            // The internal-ip module is used when host is 0.0.0.0
            // When internalIpV4Sync returns a valid IP, it should be used
            dualServer = await createDualServer({
                httpPort: basePort + 200,
                httpHost: "0.0.0.0",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            const config = dualServer.storage.getServerConfig();
            // The endpoint should NOT contain 0.0.0.0 since that's not routable
            expect(config?.httpEndpoint).not.toContain("0.0.0.0");
            // It should contain the actual IP or 127.0.0.1 fallback
            expect(config?.httpEndpoint).toMatch(/http:\/\/[\d.]+:\d+\/log/);
        });

        it("should use specified host when not 0.0.0.0", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 210,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            const config = dualServer.storage.getServerConfig();
            expect(config?.httpEndpoint).toContain("127.0.0.1");
        });

        it("should use localhost IP format rather than hostname in fallback", async () => {
            // When bound to 0.0.0.0, the endpoint should be an IP address
            // not a hostname (which may not resolve from other machines)
            dualServer = await createDualServer({
                httpPort: basePort + 220,
                httpHost: "0.0.0.0",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            const config = dualServer.storage.getServerConfig();
            // Should be an IP address pattern, not a hostname
            // IP addresses contain only digits and dots
            const endpointUrl = config?.httpEndpoint ?? "";
            const hostMatch = endpointUrl.match(/http:\/\/([^:]+):/);
            const host = hostMatch?.[1] ?? "";

            // The host should be a valid IP address (digits and dots only)
            // or "localhost" - but NOT an arbitrary hostname like "mycomputer.local"
            expect(host).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
        });
    });
});
