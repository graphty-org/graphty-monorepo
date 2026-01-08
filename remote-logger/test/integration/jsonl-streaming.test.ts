/**
 * Integration tests for JSONL streaming.
 *
 * Tests the full flow of logs from HTTP to JSONL files.
 */

import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLogServer } from "../../src/server/log-server.js";
import { LogStorage } from "../../src/server/log-storage.js";
import { JsonlWriter } from "../../src/server/jsonl-writer.js";

describe("JSONL streaming integration", () => {
    let server: http.Server;
    let storage: LogStorage;
    let jsonlWriter: JsonlWriter;
    let testBaseDir: string;
    let port: number;

    beforeEach(async () => {
        // Create unique temp directory
        testBaseDir = path.join(os.tmpdir(), `jsonl-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);

        // Create JSONL writer
        jsonlWriter = new JsonlWriter(testBaseDir);

        // Create storage with JSONL writer
        storage = new LogStorage({ jsonlWriter });

        // Create server with shared storage
        port = 8300 + Math.floor(Math.random() * 100);
        const result = await createLogServer({
            port,
            host: "127.0.0.1",
            storage,
        });
        server = result.server;

        // Wait for server to be ready
        await new Promise<void>((resolve) => {
            server.listen(port, "127.0.0.1", () => resolve());
        });
    });

    afterEach(async () => {
        // Close server
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });

        // Close JSONL writer
        await jsonlWriter.close();

        // Clean up test directory
        try {
            fs.rmSync(testBaseDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    async function sendLog(sessionId: string, logs: Array<{ time: string; level: string; message: string }>, projectMarker?: string): Promise<void> {
        const body = JSON.stringify({
            sessionId,
            logs,
            projectMarker,
        });

        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: "127.0.0.1",
                port,
                path: "/log",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                },
            }, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }

    it("streams logs to file as they arrive via HTTP", async () => {
        const marker = "test-project";
        const sessionId = `${marker}-session-123`;

        await sendLog(sessionId, [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "First log" },
            { time: "2024-01-15T10:00:01Z", level: "DEBUG", message: "Second log" },
        ], marker);

        // Flush to ensure writes are complete
        await jsonlWriter.flush();

        const filePath = jsonlWriter.getFilePath(marker);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        expect(lines.length).toBe(2);
        expect(content).toContain("First log");
        expect(content).toContain("Second log");
    });

    it("creates separate files per project marker", async () => {
        const markers = ["project-alpha", "project-beta"];

        for (const marker of markers) {
            await sendLog(`${marker}-session`, [
                { time: new Date().toISOString(), level: "INFO", message: `Log for ${marker}` },
            ], marker);
        }

        // Flush to ensure writes are complete
        await jsonlWriter.flush();

        for (const marker of markers) {
            const filePath = jsonlWriter.getFilePath(marker);
            expect(fs.existsSync(filePath)).toBe(true);

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content).toContain(`Log for ${marker}`);
        }
    });

    it("file is readable by external tools during streaming", async () => {
        const marker = "streaming-read-test";
        const sessionId = `${marker}-session`;

        // Send first batch
        await sendLog(sessionId, [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "First batch" },
        ], marker);
        await jsonlWriter.flush();

        // Read file while more logs are still being written
        const filePath = jsonlWriter.getFilePath(marker);
        const firstRead = fs.readFileSync(filePath, "utf-8");
        expect(firstRead).toContain("First batch");

        // Send second batch
        await sendLog(sessionId, [
            { time: "2024-01-15T10:00:01Z", level: "INFO", message: "Second batch" },
        ], marker);
        await jsonlWriter.flush();

        // Read again - should have both batches
        const secondRead = fs.readFileSync(filePath, "utf-8");
        expect(secondRead).toContain("First batch");
        expect(secondRead).toContain("Second batch");

        const lines = secondRead.trim().split("\n");
        expect(lines.length).toBe(2);
    });

    it("written file contains valid JSONL format", async () => {
        const marker = "jsonl-format-test";

        await sendLog(`${marker}-session`, [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test message" },
            { time: "2024-01-15T10:00:01Z", level: "ERROR", message: "Error message" },
        ], marker);
        await jsonlWriter.flush();

        const filePath = jsonlWriter.getFilePath(marker);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        for (const line of lines) {
            // Each line should be valid JSON
            const parsed = JSON.parse(line);
            expect(parsed).toHaveProperty("time");
            expect(parsed).toHaveProperty("level");
            expect(parsed).toHaveProperty("message");
            expect(parsed).toHaveProperty("sessionId");
        }
    });

    it("handles multiple sessions writing to same project file", async () => {
        const marker = "multi-session-project";

        // Send logs from different sessions
        await sendLog(`${marker}-session-1`, [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Session 1 log" },
        ], marker);

        await sendLog(`${marker}-session-2`, [
            { time: "2024-01-15T10:00:01Z", level: "INFO", message: "Session 2 log" },
        ], marker);

        await jsonlWriter.flush();

        const filePath = jsonlWriter.getFilePath(marker);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).toContain("Session 1 log");
        expect(content).toContain("Session 2 log");
        expect(content).toContain(`${marker}-session-1`);
        expect(content).toContain(`${marker}-session-2`);
    });
});
