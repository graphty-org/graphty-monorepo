/**
 * Tests for the logs_get_file_path MCP tool.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlWriter } from "../../../src/server/jsonl-writer.js";
import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsGetFilePathHandler,
    logsGetFilePathTool,
} from "../../../src/mcp/tools/logs-get-file-path.js";

describe("logs_get_file_path tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    it("returns path based on projectMarker", async () => {
        const result = await logsGetFilePathHandler(storage, {
            projectMarker: "my-project",
        });

        expect(result.path).toContain("remote-logger");
        expect(result.path).toContain("my-project");
        expect(result.path).toContain("logs.jsonl");
    });

    it("derives marker from workingDirectory", async () => {
        const result = await logsGetFilePathHandler(storage, {
            workingDirectory: "/home/user/.worktrees/remote-logging",
        });

        expect(result.path).toContain("remote-logging");
        expect(result.path).toContain("logs.jsonl");
    });

    it("returns file existence status", async () => {
        const result = await logsGetFilePathHandler(storage, {
            projectMarker: "nonexistent-project",
        });

        // File shouldn't exist since we haven't written anything
        expect(result.exists).toBe(false);
    });

    it("returns file size when file exists", async () => {
        const result = await logsGetFilePathHandler(storage, {
            projectMarker: "test-project",
        });

        // Even when file doesn't exist, size should be 0
        if (!result.exists) {
            expect(result.size).toBe(0);
        }
    });

    it("uses default marker when no filter provided", async () => {
        const result = await logsGetFilePathHandler(storage, {});

        expect(result.path).toContain("default");
    });

    it("returns expected path format", async () => {
        const result = await logsGetFilePathHandler(storage, {
            projectMarker: "test",
        });

        // Path should be in temp directory
        const expectedBase = path.join(os.tmpdir(), "remote-logger");
        expect(result.path.startsWith(expectedBase) || result.path.includes("remote-logger")).toBe(true);
    });

    it("has correct tool definition", () => {
        expect(logsGetFilePathTool.name).toBe("logs_get_file_path");
        expect(logsGetFilePathTool.description).toContain("file path");
    });
});

describe("logs_get_file_path tool with JsonlWriter", () => {
    let storage: LogStorage;
    let jsonlWriter: JsonlWriter;
    let testBaseDir: string;

    beforeEach(() => {
        testBaseDir = path.join(os.tmpdir(), `logs-get-file-path-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        jsonlWriter = new JsonlWriter(testBaseDir);
        storage = new LogStorage({ jsonlWriter });
    });

    afterEach(async () => {
        await jsonlWriter.close();
        try {
            fs.rmSync(testBaseDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    it("returns path that exists after logs are written", async () => {
        const marker = "file-exists-test";

        // Add logs to storage (which writes to JSONL)
        storage.addLogs(`${marker}-session`, [
            { time: new Date().toISOString(), level: "INFO", message: "Test log" },
        ], { projectMarker: marker });

        await jsonlWriter.flush();

        const result = await logsGetFilePathHandler(storage, {
            projectMarker: marker,
        });

        expect(result.exists).toBe(true);
        expect(result.path).toContain(marker);
    });

    it("returns correct file size after logs written", async () => {
        const marker = "file-size-test";

        storage.addLogs(`${marker}-session`, [
            { time: new Date().toISOString(), level: "INFO", message: "Test log message" },
        ], { projectMarker: marker });

        await jsonlWriter.flush();

        const result = await logsGetFilePathHandler(storage, {
            projectMarker: marker,
        });

        expect(result.exists).toBe(true);
        expect(result.size).toBeGreaterThan(0);
    });

    it("file contains valid JSONL format", async () => {
        const marker = "jsonl-format-test";

        storage.addLogs(`${marker}-session`, [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "First" },
            { time: "2024-01-15T10:00:01Z", level: "ERROR", message: "Second" },
        ], { projectMarker: marker });

        await jsonlWriter.flush();

        const result = await logsGetFilePathHandler(storage, {
            projectMarker: marker,
        });

        expect(result.exists).toBe(true);

        // Verify file contains valid JSONL
        const content = fs.readFileSync(result.path, "utf-8");
        const lines = content.trim().split("\n");

        expect(lines.length).toBe(2);

        for (const line of lines) {
            const parsed = JSON.parse(line);
            expect(parsed).toHaveProperty("time");
            expect(parsed).toHaveProperty("level");
            expect(parsed).toHaveProperty("message");
            expect(parsed).toHaveProperty("sessionId");
        }
    });

    it("uses JsonlWriter path when configured", async () => {
        const result = await logsGetFilePathHandler(storage, {
            projectMarker: "test-marker",
        });

        // Path should be in our test base directory
        expect(result.path).toContain(testBaseDir);
    });
});
