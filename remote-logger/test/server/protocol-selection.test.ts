/**
 * Tests for protocol selection (HTTP vs HTTPS).
 *
 * Regression tests for:
 * - HTTP is the default protocol (for browser compatibility)
 * - HTTPS is only used when valid certPath and keyPath are provided
 * - Status reporting matching actual server protocol
 */

import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";
import { createLogServer } from "../../src/server/log-server.js";
import { LogStorage } from "../../src/server/log-storage.js";
import { generateSelfSignedCert } from "../../src/server/self-signed-cert.js";

describe("Protocol selection", () => {
    let storage: LogStorage;
    let dualServer: DualServerResult | undefined;
    const basePort = 8700;
    let certPath: string;
    let keyPath: string;
    const tmpDir = path.join(process.cwd(), "tmp");

    beforeEach(() => {
        storage = new LogStorage();
        // Generate test certs
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        certPath = path.join(tmpDir, `test-cert-${Date.now()}.pem`);
        keyPath = path.join(tmpDir, `test-key-${Date.now()}.pem`);
        const { cert, key } = generateSelfSignedCert("127.0.0.1");
        fs.writeFileSync(certPath, cert);
        fs.writeFileSync(keyPath, key);
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
            dualServer = undefined;
        }
        storage.stopCleanupTimer();
        // Cleanup cert files
        try {
            if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
            if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
        } catch {
            // Ignore cleanup errors
        }
    });

    describe("createLogServer", () => {
        it("creates HTTP server by default (no certs provided)", () => {
            const result = createLogServer({
                port: basePort,
                host: "127.0.0.1",
                storage,
                quiet: true,
            });

            // HTTP server is http.Server but NOT https.Server
            expect(result.server.constructor.name).toBe("Server");
            expect((result.server as https.Server).setSecureContext).toBeUndefined();
        });

        it("creates HTTPS server when certPath and keyPath are provided", () => {
            const result = createLogServer({
                port: basePort + 1,
                host: "127.0.0.1",
                storage,
                quiet: true,
                certPath,
                keyPath,
            });

            expect(result.server).toBeInstanceOf(https.Server);
        });

        it("falls back to HTTP if cert files do not exist", () => {
            const result = createLogServer({
                port: basePort + 2,
                host: "127.0.0.1",
                storage,
                quiet: true,
                certPath: "/nonexistent/cert.pem",
                keyPath: "/nonexistent/key.pem",
            });

            // Should fall back to HTTP
            expect(result.server.constructor.name).toBe("Server");
            expect((result.server as https.Server).setSecureContext).toBeUndefined();
        });
    });

    describe("createDualServer", () => {
        it("creates HTTP server by default (no certs provided)", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 10,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            // Default is HTTP for browser compatibility
            expect((dualServer.httpServer as https.Server).setSecureContext).toBeUndefined();
        });

        it("creates HTTPS server when certPath and keyPath are provided", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 11,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                certPath,
                keyPath,
            });

            expect(dualServer.httpServer).toBeInstanceOf(https.Server);
        });

        it("status reports http protocol when using HTTP (default)", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 12,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            const config = dualServer.storage.getServerConfig();
            expect(config?.protocol).toBe("http");
            expect(config?.httpEndpoint).toContain("http://");
            expect(config?.httpEndpoint).not.toContain("https://");
        });

        it("status reports https protocol when using HTTPS", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 13,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                certPath,
                keyPath,
            });

            const config = dualServer.storage.getServerConfig();
            expect(config?.protocol).toBe("https");
            expect(config?.httpEndpoint).toContain("https://");
        });

        it("protocol in status matches actual server type (HTTP)", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 14,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
            });

            const config = dualServer.storage.getServerConfig();

            // Protocol should be http
            expect(config?.protocol).toBe("http");

            // Server should actually be HTTP (not HTTPS)
            expect((dualServer.httpServer as https.Server).setSecureContext).toBeUndefined();
        });

        it("protocol in status matches actual server type (HTTPS)", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 15,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                certPath,
                keyPath,
            });

            const config = dualServer.storage.getServerConfig();

            // Protocol should be https
            expect(config?.protocol).toBe("https");

            // Server should actually be HTTPS
            expect(dualServer.httpServer).toBeInstanceOf(https.Server);
        });
    });

    describe("HTTPS functionality", () => {
        it("HTTPS server accepts connections with self-signed cert", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 20,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                certPath,
                keyPath,
            });

            const actualPort = dualServer.httpPort!;

            // Make HTTPS request (ignoring self-signed cert)
            const response = await new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
                const req = https.request(
                    {
                        hostname: "127.0.0.1",
                        port: actualPort,
                        path: "/health",
                        method: "GET",
                        rejectUnauthorized: false, // Accept self-signed cert
                    },
                    (res) => {
                        let data = "";
                        res.on("data", (chunk) => { data += chunk; });
                        res.on("end", () => {
                            resolve({ statusCode: res.statusCode!, data });
                        });
                    },
                );
                req.on("error", reject);
                req.end();
            });

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.data)).toHaveProperty("status", "ok");
        });

        it("HTTPS server handles log POST requests", async () => {
            dualServer = await createDualServer({
                httpPort: basePort + 21,
                httpHost: "127.0.0.1",
                httpEnabled: true,
                mcpEnabled: false,
                quiet: true,
                certPath,
                keyPath,
            });

            const actualPort = dualServer.httpPort!;
            const body = JSON.stringify({
                sessionId: "https-test-session",
                logs: [{ time: new Date().toISOString(), level: "INFO", message: "HTTPS test" }],
            });

            const response = await new Promise<{ statusCode: number }>((resolve, reject) => {
                const req = https.request(
                    {
                        hostname: "127.0.0.1",
                        port: actualPort,
                        path: "/log",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Content-Length": Buffer.byteLength(body),
                        },
                        rejectUnauthorized: false,
                    },
                    (res) => {
                        resolve({ statusCode: res.statusCode! });
                    },
                );
                req.on("error", reject);
                req.write(body);
                req.end();
            });

            expect(response.statusCode).toBe(200);

            // Verify log was stored
            const logs = dualServer.storage.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("HTTPS test");
        });
    });
});
