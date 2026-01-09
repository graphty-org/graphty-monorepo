/**
 * Tests for the logs_clear MCP tool.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsClearHandler,
    logsClearTool,
    logsClearInputSchema,
} from "../../../src/mcp/tools/logs-clear.js";

describe("logs_clear tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
        // Add some test data
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Log 1" },
        ], { projectMarker: "project-a" });
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:01:00Z", level: "INFO", message: "Log 2" },
        ], { projectMarker: "project-b" });
        storage.addLogs("session-3", [
            { time: "2024-01-15T10:02:00Z", level: "INFO", message: "Log 3" },
        ], { projectMarker: "project-a" });
    });

    it("requires confirm: true", async () => {
        const result = await logsClearHandler(storage, {
            confirm: true,
        });

        expect(result.success).toBe(true);
        expect(result.cleared).toBe(3);
        expect(storage.getSessions()).toHaveLength(0);
    });

    it("rejects when confirm is false", async () => {
        const result = await logsClearHandler(storage, {
            confirm: false,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("confirm");
        // Logs should not be cleared
        expect(storage.getSessions()).toHaveLength(3);
    });

    it("rejects when confirm is missing", async () => {
        const result = await logsClearHandler(storage, {});

        expect(result.success).toBe(false);
        expect(result.error).toContain("confirm");
        // Logs should not be cleared
        expect(storage.getSessions()).toHaveLength(3);
    });

    it("clears all logs when no filter", async () => {
        const result = await logsClearHandler(storage, {
            confirm: true,
        });

        expect(result.success).toBe(true);
        expect(result.cleared).toBe(3);
        expect(storage.getSessions()).toHaveLength(0);
    });

    it("clears only matching projectMarker", async () => {
        const result = await logsClearHandler(storage, {
            confirm: true,
            projectMarker: "project-a",
        });

        expect(result.success).toBe(true);
        expect(result.cleared).toBe(2);

        // project-b session should remain
        const remaining = storage.getSessions();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].projectMarker).toBe("project-b");
    });

    it("clears only matching sessionId", async () => {
        const result = await logsClearHandler(storage, {
            confirm: true,
            sessionId: "session-2",
        });

        expect(result.success).toBe(true);
        expect(result.cleared).toBe(1);

        // Other sessions should remain
        const remaining = storage.getSessions();
        expect(remaining).toHaveLength(2);
        expect(remaining.some(s => s.sessionId === "session-1")).toBe(true);
        expect(remaining.some(s => s.sessionId === "session-3")).toBe(true);
    });

    it("returns count of cleared logs", async () => {
        const result = await logsClearHandler(storage, {
            confirm: true,
            projectMarker: "project-a",
        });

        expect(result.cleared).toBe(2);
    });

    it("validates input schema", () => {
        const validInput = logsClearInputSchema.safeParse({
            confirm: true,
            projectMarker: "test",
        });
        expect(validInput.success).toBe(true);

        const validWithSession = logsClearInputSchema.safeParse({
            confirm: true,
            sessionId: "test-session",
        });
        expect(validWithSession.success).toBe(true);
    });

    it("has correct tool definition", () => {
        expect(logsClearTool.name).toBe("logs_clear");
        expect(logsClearTool.description).toContain("Clear");
        expect(logsClearTool.description).toContain("confirm");
    });
});
