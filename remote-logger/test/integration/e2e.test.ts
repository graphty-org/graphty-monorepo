/**
 * End-to-end integration tests.
 *
 * Tests the full flow from browser client to MCP queries.
 */

import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlWriter } from "../../src/server/jsonl-writer.js";
import { LogStorage } from "../../src/server/log-storage.js";
import { createDualServer, type DualServerResult } from "../../src/server/dual-server.js";

describe("E2E: Browser to Claude Code", () => {
    let dualServer: DualServerResult;
    let port: number;
    let testBaseDir: string;
    let jsonlWriter: JsonlWriter;

    beforeEach(async () => {
        port = 8500 + Math.floor(Math.random() * 100);

        // Create unique temp directory
        testBaseDir = path.join(
            os.tmpdir(),
            `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        );

        // Create JSONL writer
        jsonlWriter = new JsonlWriter(testBaseDir);
    });

    afterEach(async () => {
        if (dualServer) {
            await dualServer.shutdown();
        }

        if (jsonlWriter) {
            await jsonlWriter.close();
        }

        // Clean up test directory
        try {
            fs.rmSync(testBaseDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    /**
     * Helper to send a log via HTTP POST (simulating browser).
     */
    async function sendLogFromBrowser(
        sessionId: string,
        logs: Array<{ time: string; level: string; message: string; data?: Record<string, unknown> }>,
        projectMarker?: string,
        worktreePath?: string,
    ): Promise<void> {
        const body = JSON.stringify({
            sessionId,
            logs,
            projectMarker,
            worktreePath,
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

    it("browser sends logs → MCP queries return them", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const projectMarker = "graphty-element";
        const sessionId = `${projectMarker}-${Date.now()}-abc123`;

        // Simulate browser sending logs
        await sendLogFromBrowser(
            sessionId,
            [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Component initialized" },
                { time: "2024-01-15T10:00:01Z", level: "DEBUG", message: "Render cycle started" },
                { time: "2024-01-15T10:00:02Z", level: "ERROR", message: "Network request failed" },
            ],
            projectMarker,
            "/home/user/.worktrees/remote-logging",
        );

        // Query via storage (simulates MCP tool query)
        const sessions = dualServer.storage.getSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].projectMarker).toBe(projectMarker);
        expect(sessions[0].logCount).toBe(3);
        expect(sessions[0].errorCount).toBe(1);

        const logs = dualServer.storage.getLogs({ projectMarker });
        expect(logs).toHaveLength(3);
        expect(logs.map((l) => l.level)).toContain("ERROR");

        const errors = dualServer.storage.getErrors({ projectMarker });
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe("Network request failed");
    });

    it("multiple projects stay isolated", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const projects = ["project-alpha", "project-beta", "project-gamma"];

        // Send logs from different projects
        for (const project of projects) {
            await sendLogFromBrowser(
                `${project}-session-${Date.now()}`,
                [
                    { time: new Date().toISOString(), level: "INFO", message: `Log from ${project}` },
                    { time: new Date().toISOString(), level: "WARN", message: `Warning from ${project}` },
                ],
                project,
            );
        }

        // Verify project isolation
        for (const project of projects) {
            const logs = dualServer.storage.getLogs({ projectMarker: project });
            expect(logs).toHaveLength(2);
            expect(logs.every((l) => l.message.includes(project))).toBe(true);
        }

        // Verify total counts
        const allSessions = dualServer.storage.getSessions();
        expect(allSessions).toHaveLength(3);

        const allLogs = dualServer.storage.getLogs();
        expect(allLogs).toHaveLength(6);
    });

    it("JSONL file contains all logs", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const projectMarker = "jsonl-test-project";

        // Send multiple batches of logs
        for (let i = 0; i < 3; i++) {
            await sendLogFromBrowser(
                `${projectMarker}-session-${i}`,
                [
                    { time: new Date().toISOString(), level: "INFO", message: `Batch ${i} log 1` },
                    { time: new Date().toISOString(), level: "DEBUG", message: `Batch ${i} log 2` },
                ],
                projectMarker,
            );
        }

        // Flush JSONL writer
        await jsonlWriter.flush();

        // Read JSONL file
        const filePath = jsonlWriter.getFilePath(projectMarker);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        // Should have 6 log entries (3 batches × 2 logs)
        expect(lines).toHaveLength(6);

        // Each line should be valid JSON with expected structure
        for (const line of lines) {
            const parsed = JSON.parse(line);
            expect(parsed).toHaveProperty("time");
            expect(parsed).toHaveProperty("level");
            expect(parsed).toHaveProperty("message");
            expect(parsed).toHaveProperty("sessionId");
        }

        // Verify content
        expect(content).toContain("Batch 0");
        expect(content).toContain("Batch 1");
        expect(content).toContain("Batch 2");
    });

    it("logs_search finds content in file", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const projectMarker = "search-test-project";

        // Send logs with specific searchable content
        await sendLogFromBrowser(
            `${projectMarker}-session-1`,
            [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "User logged in successfully" },
                { time: "2024-01-15T10:00:01Z", level: "ERROR", message: "Database connection failed" },
                { time: "2024-01-15T10:00:02Z", level: "INFO", message: "User profile loaded" },
                { time: "2024-01-15T10:00:03Z", level: "WARN", message: "Session timeout warning" },
            ],
            projectMarker,
        );

        // Search for "user" (case-insensitive)
        const userLogs = dualServer.storage.search({ query: "user", projectMarker });
        expect(userLogs).toHaveLength(2);
        expect(userLogs.some((l) => l.message.includes("logged in"))).toBe(true);
        expect(userLogs.some((l) => l.message.includes("profile"))).toBe(true);

        // Search for "failed"
        const failedLogs = dualServer.storage.search({ query: "failed", projectMarker });
        expect(failedLogs).toHaveLength(1);
        expect(failedLogs[0].level).toBe("ERROR");

        // Search with regex
        const warningsOrErrors = dualServer.storage.search({
            query: "failed|timeout",
            regex: true,
            projectMarker,
        });
        expect(warningsOrErrors).toHaveLength(2);

        // Search by level filter
        const errorSearch = dualServer.storage.search({
            query: "connection",
            level: "ERROR",
            projectMarker,
        });
        expect(errorSearch).toHaveLength(1);
    });

    it("retains worktreePath metadata through the flow", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const worktreePath = "/home/user/projects/.worktrees/feature-branch";
        const projectMarker = "feature-branch";

        await sendLogFromBrowser(
            `${projectMarker}-session-abc`,
            [{ time: new Date().toISOString(), level: "INFO", message: "Test log" }],
            projectMarker,
            worktreePath,
        );

        const sessions = dualServer.storage.getSessions();
        expect(sessions[0].worktreePath).toBe(worktreePath);
    });

    it("handles high volume of logs", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        const projectMarker = "high-volume-test";
        const logCount = 100;

        // Send many logs in a single batch
        const logs = [];
        for (let i = 0; i < logCount; i++) {
            logs.push({
                time: new Date(Date.now() + i).toISOString(),
                level: i % 10 === 0 ? "ERROR" : "INFO",
                message: `Log message ${i}`,
                data: { index: i },
            });
        }

        await sendLogFromBrowser(`${projectMarker}-session`, logs, projectMarker);

        // Verify all logs stored
        const storedLogs = dualServer.storage.getLogs({ projectMarker });
        expect(storedLogs).toHaveLength(logCount);

        // Verify error count (every 10th log is an error)
        const errors = dualServer.storage.getErrors({ projectMarker });
        expect(errors).toHaveLength(10);

        // Verify JSONL file
        await jsonlWriter.flush();
        const filePath = jsonlWriter.getFilePath(projectMarker);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");
        expect(lines).toHaveLength(logCount);
    });

    it("health check reflects stored data", async () => {
        dualServer = await createDualServer({
            httpPort: port,
            httpHost: "127.0.0.1",
            httpEnabled: true,
            mcpEnabled: true,
                        quiet: true,
            jsonlWriter,
        });

        // Initial health
        const initialHealth = dualServer.storage.getHealth();
        expect(initialHealth.status).toBe("ok");
        expect(initialHealth.sessionCount).toBe(0);
        expect(initialHealth.totalLogs).toBe(0);

        // Add logs
        await sendLogFromBrowser(
            "session-1",
            [
                { time: new Date().toISOString(), level: "INFO", message: "Log 1" },
                { time: new Date().toISOString(), level: "ERROR", message: "Error 1" },
            ],
            "project-1",
        );

        await sendLogFromBrowser(
            "session-2",
            [{ time: new Date().toISOString(), level: "DEBUG", message: "Log 2" }],
            "project-2",
        );

        // Check health after logs
        const updatedHealth = dualServer.storage.getHealth();
        expect(updatedHealth.sessionCount).toBe(2);
        expect(updatedHealth.totalLogs).toBe(3);
        expect(updatedHealth.totalErrors).toBe(1);
        expect(updatedHealth.uptimeMs).toBeGreaterThan(0);
    });
});
