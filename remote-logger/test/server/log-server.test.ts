import type * as http from "http";
import type * as https from "https";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { clearLogs, startLogServer } from "../../src/server/log-server.js";

// Use a counter to ensure unique ports for each test
// Use port range 8100-8199 for tests (9000-9099 is reserved for external connections)
let portCounter = 0;

function getNextPort(): number {
    portCounter++;
    return 8100 + (portCounter % 100);
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

describe("Log Server", () => {
    let server: http.Server | https.Server | null = null;
    let port: number;

    beforeEach(() => {
        port = getNextPort();
        clearLogs(); // Clear logs between tests
    });

    afterEach(async () => {
        if (server) {
            const s = server;
            server = null;
            await new Promise<void>((resolve) => {
                s.close(() => {
                    resolve();
                });
            });
        }
    });

    test("should start on specified port", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const address = server.address();
        expect(address).toBeTruthy();
        if (typeof address === "object" && address) {
            expect(address.port).toBe(port);
        }
    });

    test("should handle POST /log and store logs", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const logData = {
            sessionId: "test-session-123",
            logs: [
                {
                    time: new Date().toISOString(),
                    level: "INFO",
                    message: "Test log message",
                },
            ],
        };

        const response = await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test("should handle GET /logs and return all logs", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        // First, post some logs
        const logData = {
            sessionId: "test-session-456",
            logs: [
                { time: new Date().toISOString(), level: "INFO", message: "Log 1" },
                { time: new Date().toISOString(), level: "DEBUG", message: "Log 2" },
            ],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Then get all logs
        const response = await fetch(`http://127.0.0.1:${port}/logs`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data["test-session-456"]).toBeDefined();
        expect(data["test-session-456"]).toHaveLength(2);
    });

    test("should handle GET /logs/recent with limit", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        // Post multiple logs
        const logData = {
            sessionId: "test-session-789",
            logs: [
                { time: new Date(Date.now() - 3000).toISOString(), level: "INFO", message: "Log 1" },
                { time: new Date(Date.now() - 2000).toISOString(), level: "INFO", message: "Log 2" },
                { time: new Date(Date.now() - 1000).toISOString(), level: "INFO", message: "Log 3" },
            ],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Get recent logs with limit
        const response = await fetch(`http://127.0.0.1:${port}/logs/recent?n=2`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.showing).toBe(2);
        expect(data.logs).toHaveLength(2);
    });

    test("should handle GET /logs/errors", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        // Post mixed log levels
        const logData = {
            sessionId: "test-session-errors",
            logs: [
                { time: new Date().toISOString(), level: "INFO", message: "Info message" },
                { time: new Date().toISOString(), level: "ERROR", message: "Error message" },
                { time: new Date().toISOString(), level: "WARN", message: "Warning message" },
            ],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Get error logs only
        const response = await fetch(`http://127.0.0.1:${port}/logs/errors`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.total).toBe(1);
        expect(data.logs[0].level).toBe("ERROR");
    });

    test("should handle POST /logs/clear", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        // Post some logs
        const logData = {
            sessionId: "test-session-clear",
            logs: [{ time: new Date().toISOString(), level: "INFO", message: "To be cleared" }],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Clear logs
        const clearResponse = await fetch(`http://127.0.0.1:${port}/logs/clear`, {
            method: "POST",
        });
        expect(clearResponse.status).toBe(200);

        // Verify logs are cleared
        const logsResponse = await fetch(`http://127.0.0.1:${port}/logs`);
        const data = await logsResponse.json();
        expect(Object.keys(data)).toHaveLength(0);
    });

    test("should handle GET /health", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const response = await fetch(`http://127.0.0.1:${port}/health`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.status).toBe("ok");
        expect(data.sessions).toBe(0);
    });

    test("should handle CORS preflight (OPTIONS)", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const response = await fetch(`http://127.0.0.1:${port}/log`, {
            method: "OPTIONS",
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });

    test("should return 404 for unknown routes", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const response = await fetch(`http://127.0.0.1:${port}/unknown`);
        expect(response.status).toBe(404);
    });

    test("should return 400 for invalid JSON in POST /log", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const response = await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "invalid json",
        });

        expect(response.status).toBe(400);
    });

    // Self-signed cert auto-generation has been removed - HTTP is now the default
    // HTTPS is only used when valid certPath and keyPath are provided

    test("should write logs to file when logFile is specified", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const logFilePath = path.join(process.cwd(), "tmp", `test-logs-${Date.now()}.jsonl`);

        // Ensure tmp directory exists
        const tmpDir = path.dirname(logFilePath);
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        server = startLogServer({ port, host: "127.0.0.1", quiet: true, logFile: logFilePath });
        await waitForServer(server);

        // Post a log
        const logData = {
            sessionId: "test-session-file",
            logs: [{ time: new Date().toISOString(), level: "INFO", message: "File log test" }],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Give time for file write
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify file was written
        expect(fs.existsSync(logFilePath)).toBe(true);
        const content = fs.readFileSync(logFilePath, "utf-8");
        expect(content).toContain("File log test");

        // Cleanup
        fs.unlinkSync(logFilePath);
    });

    test("should use custom certificates when provided", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const { generateSelfSignedCert } = await import("../../src/server/self-signed-cert.js");

        // Generate test certs
        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const certPath = path.join(tmpDir, `test-cert-${Date.now()}.pem`);
        const keyPath = path.join(tmpDir, `test-key-${Date.now()}.pem`);

        const { cert, key } = generateSelfSignedCert("127.0.0.1");
        fs.writeFileSync(certPath, cert);
        fs.writeFileSync(keyPath, key);

        // HTTPS is automatically used when certPath and keyPath are provided
        server = startLogServer({
            port,
            host: "127.0.0.1",
            quiet: true,
            certPath,
            keyPath,
        });
        await waitForServer(server);

        // Server should be listening with HTTPS
        const address = server.address();
        expect(address).toBeTruthy();

        // Cleanup
        fs.unlinkSync(certPath);
        fs.unlinkSync(keyPath);
    });

    test("should print banner when not in quiet mode", async () => {
        // Mock console.log to verify banner is printed
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        server = startLogServer({ port, host: "127.0.0.1", quiet: false });
        await waitForServer(server);

        // Banner should have been printed
        expect(consoleSpy).toHaveBeenCalled();
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("Remote Log Server"))).toBe(true);

        consoleSpy.mockRestore();
    });

    test("should handle multiple log levels for display formatting", async () => {
        server = startLogServer({ port, host: "127.0.0.1", quiet: true });
        await waitForServer(server);

        const logData = {
            sessionId: "test-session-levels",
            logs: [
                { time: new Date().toISOString(), level: "ERROR", message: "Error message" },
                { time: new Date().toISOString(), level: "WARN", message: "Warning message" },
                { time: new Date().toISOString(), level: "WARNING", message: "Warning2 message" },
                { time: new Date().toISOString(), level: "INFO", message: "Info message" },
                { time: new Date().toISOString(), level: "DEBUG", message: "Debug message" },
                { time: new Date().toISOString(), level: "TRACE", message: "Trace message" },
                { time: new Date().toISOString(), level: "LOG", message: "Log message" },
                { time: new Date().toISOString(), level: "UNKNOWN", message: "Unknown level" },
            ],
        };

        const response = await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        expect(response.status).toBe(200);

        // Verify all were stored
        const logsResponse = await fetch(`http://127.0.0.1:${port}/logs`);
        const data = await logsResponse.json();
        expect(data["test-session-levels"]).toHaveLength(8);
    });

    test("should truncate very long messages in display", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        server = startLogServer({ port, host: "127.0.0.1", quiet: false });
        await waitForServer(server);

        const longMessage = "x".repeat(2000);
        const logData = {
            sessionId: "test-session-long",
            logs: [{ time: new Date().toISOString(), level: "INFO", message: longMessage }],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Check that truncation message was shown
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("truncated"))).toBe(true);

        consoleSpy.mockRestore();
    });

    test("should print certificate info when using custom certs in non-quiet mode", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const { generateSelfSignedCert } = await import("../../src/server/self-signed-cert.js");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        // Generate test certs
        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const certPath = path.join(tmpDir, `test-cert2-${Date.now()}.pem`);
        const keyPath = path.join(tmpDir, `test-key2-${Date.now()}.pem`);

        const { cert, key } = generateSelfSignedCert("127.0.0.1");
        fs.writeFileSync(certPath, cert);
        fs.writeFileSync(keyPath, key);

        // HTTPS is automatically used when certPath and keyPath are provided
        server = startLogServer({
            port,
            host: "127.0.0.1",
            quiet: false,
            certPath,
            keyPath,
        });
        await waitForServer(server);

        // Check that cert path message was shown
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("Using SSL certificates from"))).toBe(true);

        consoleSpy.mockRestore();

        // Cleanup
        fs.unlinkSync(certPath);
        fs.unlinkSync(keyPath);
    });

    // Self-signed cert warning test removed - no longer generating self-signed certs

    test("should show new session header when quiet=false", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        server = startLogServer({ port, host: "127.0.0.1", quiet: false });
        await waitForServer(server);

        const logData = {
            sessionId: "test-session-header",
            logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test message" }],
        };

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData),
        });

        // Check that session header was shown
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("NEW SESSION"))).toBe(true);

        consoleSpy.mockRestore();
    });

    test("should show cleared message when clearing logs in non-quiet mode", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        server = startLogServer({ port, host: "127.0.0.1", quiet: false });
        await waitForServer(server);

        // Clear logs
        await fetch(`http://127.0.0.1:${port}/logs/clear`, { method: "POST" });

        // Check that cleared message was shown
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("Logs cleared"))).toBe(true);

        consoleSpy.mockRestore();
    });

    test("should log error parsing invalid JSON in non-quiet mode", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        server = startLogServer({ port, host: "127.0.0.1", quiet: false });
        await waitForServer(server);

        await fetch(`http://127.0.0.1:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "invalid json",
        });

        // Check that error was logged
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test("should write log file with logFile option and print message when non-quiet", async () => {
        const fs = await import("fs");
        const path = await import("path");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const logFilePath = path.join(process.cwd(), "tmp", `test-logs-nonquiet-${Date.now()}.jsonl`);

        // Ensure tmp directory exists
        const tmpDir = path.dirname(logFilePath);
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        server = startLogServer({ port, host: "127.0.0.1", quiet: false, logFile: logFilePath });
        await waitForServer(server);

        // Check that log file message was printed
        const calls = consoleSpy.mock.calls.map((c) => c.join(""));
        expect(calls.some((c) => c.includes("Writing logs to"))).toBe(true);

        consoleSpy.mockRestore();

        // Cleanup
        if (fs.existsSync(logFilePath)) {
            fs.unlinkSync(logFilePath);
        }
    });
});
