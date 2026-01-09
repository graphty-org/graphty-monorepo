/**
 * Tests for the logs_receive MCP tool.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsReceiveHandler,
    logsReceiveTool,
    logsReceiveInputSchema,
} from "../../../src/mcp/tools/logs-receive.js";

describe("logs_receive tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    it("stores logs with session ID", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "test-session-123",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test message" },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.count).toBe(1);

        // Verify logs are stored
        const logs = storage.getLogsForSession("test-session-123");
        expect(logs).toHaveLength(1);
        expect(logs[0].message).toBe("Test message");
    });

    it("accepts optional projectMarker", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "test-session-456",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test" },
            ],
            projectMarker: "my-project",
        });

        expect(result.success).toBe(true);

        // Verify project marker is set
        const sessions = storage.getSessions({ projectMarker: "my-project" });
        expect(sessions).toHaveLength(1);
        expect(sessions[0].projectMarker).toBe("my-project");
    });

    it("derives marker from sessionId prefix if not provided", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "graphty-element-1704067200000-abc123",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test" },
            ],
        });

        expect(result.success).toBe(true);

        // Verify project marker is derived from session ID
        const sessions = storage.getSessions({ projectMarker: "graphty-element" });
        expect(sessions).toHaveLength(1);
    });

    it("validates log entry format", () => {
        // Test that schema validates correctly
        const validInput = logsReceiveInputSchema.safeParse({
            sessionId: "test",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test" },
            ],
        });
        expect(validInput.success).toBe(true);

        // Missing required fields
        const invalidInput = logsReceiveInputSchema.safeParse({
            sessionId: "test",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO" }, // missing message
            ],
        });
        expect(invalidInput.success).toBe(false);
    });

    it("returns success with count", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "test-session",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Message 1" },
                { time: "2024-01-15T10:01:00Z", level: "INFO", message: "Message 2" },
                { time: "2024-01-15T10:02:00Z", level: "ERROR", message: "Message 3" },
            ],
        });

        expect(result.success).toBe(true);
        expect(result.count).toBe(3);
        expect(result.sessionId).toBe("test-session");
    });

    it("handles optional worktreePath", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "test-session",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test" },
            ],
            worktreePath: "/home/user/.worktrees/remote-logging",
        });

        expect(result.success).toBe(true);

        // Verify worktree path is stored
        const metadata = storage.getSessionMetadata("test-session");
        expect(metadata?.worktreePath).toBe("/home/user/.worktrees/remote-logging");
    });

    it("handles optional pageUrl", async () => {
        const result = await logsReceiveHandler(storage, {
            sessionId: "test-session",
            logs: [
                { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Test" },
            ],
            pageUrl: "http://localhost:3000/page",
        });

        expect(result.success).toBe(true);

        // Verify page URL is stored
        const metadata = storage.getSessionMetadata("test-session");
        expect(metadata?.pageUrl).toBe("http://localhost:3000/page");
    });

    it("has correct tool definition", () => {
        expect(logsReceiveTool.name).toBe("logs_receive");
        expect(logsReceiveTool.description).toContain("Store logs");
    });
});
