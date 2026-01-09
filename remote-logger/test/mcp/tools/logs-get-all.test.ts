/**
 * Tests for the logs_get_all MCP tool.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsGetAllHandler,
    logsGetAllTool,
} from "../../../src/mcp/tools/logs-get-all.js";

describe("logs_get_all tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    it("returns all logs grouped by session", async () => {
        // Add logs to two sessions
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Session 1 log 1" },
            { time: "2024-01-15T10:01:00Z", level: "INFO", message: "Session 1 log 2" },
        ]);
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:02:00Z", level: "ERROR", message: "Session 2 log 1" },
        ]);

        const result = await logsGetAllHandler(storage, {});

        expect(result.sessions).toHaveProperty("session-1");
        expect(result.sessions).toHaveProperty("session-2");
        expect(result.sessions["session-1"]).toHaveLength(2);
        expect(result.sessions["session-2"]).toHaveLength(1);
        expect(result.sessionCount).toBe(2);
        expect(result.totalLogs).toBe(3);
    });

    it("filters by projectMarker", async () => {
        // Add logs to sessions with different markers
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Project A log" },
        ], { projectMarker: "project-a" });
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:01:00Z", level: "INFO", message: "Project B log" },
        ], { projectMarker: "project-b" });

        const result = await logsGetAllHandler(storage, {
            projectMarker: "project-a",
        });

        expect(result.sessions).toHaveProperty("session-1");
        expect(result.sessions).not.toHaveProperty("session-2");
        expect(result.sessionCount).toBe(1);
        expect(result.totalLogs).toBe(1);
    });

    it("returns empty object when no logs", async () => {
        const result = await logsGetAllHandler(storage, {});

        expect(result.sessions).toEqual({});
        expect(result.sessionCount).toBe(0);
        expect(result.totalLogs).toBe(0);
    });

    it("has correct tool definition", () => {
        expect(logsGetAllTool.name).toBe("logs_get_all");
        expect(logsGetAllTool.description).toContain("all logs");
    });
});
