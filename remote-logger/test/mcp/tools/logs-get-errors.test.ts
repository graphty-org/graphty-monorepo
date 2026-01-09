/**
 * Tests for the logs_get_errors MCP tool.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsGetErrorsHandler,
    logsGetErrorsTool,
} from "../../../src/mcp/tools/logs-get-errors.js";

describe("logs_get_errors tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    it("returns only ERROR level logs", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Info message" },
            { time: "2024-01-15T10:01:00Z", level: "ERROR", message: "Error message 1" },
            { time: "2024-01-15T10:02:00Z", level: "WARN", message: "Warning message" },
            { time: "2024-01-15T10:03:00Z", level: "ERROR", message: "Error message 2" },
        ]);

        const result = await logsGetErrorsHandler(storage, {});

        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].message).toBe("Error message 1");
        expect(result.errors[1].message).toBe("Error message 2");
        expect(result.count).toBe(2);
    });

    it("filters by projectMarker", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "ERROR", message: "Project A error" },
        ], { projectMarker: "project-a" });
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:01:00Z", level: "ERROR", message: "Project B error" },
        ], { projectMarker: "project-b" });

        const result = await logsGetErrorsHandler(storage, {
            projectMarker: "project-a",
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe("Project A error");
    });

    it("filters by since timestamp", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T09:00:00Z", level: "ERROR", message: "Old error" },
            { time: "2024-01-15T11:00:00Z", level: "ERROR", message: "New error" },
        ]);

        const result = await logsGetErrorsHandler(storage, {
            since: "2024-01-15T10:00:00Z",
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe("New error");
    });

    it("returns empty array when no errors", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "Info message" },
            { time: "2024-01-15T10:01:00Z", level: "WARN", message: "Warning message" },
        ]);

        const result = await logsGetErrorsHandler(storage, {});

        expect(result.errors).toHaveLength(0);
        expect(result.count).toBe(0);
    });

    it("returns errors sorted chronologically", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:03:00Z", level: "ERROR", message: "Third" },
            { time: "2024-01-15T10:01:00Z", level: "ERROR", message: "First" },
            { time: "2024-01-15T10:02:00Z", level: "ERROR", message: "Second" },
        ]);

        const result = await logsGetErrorsHandler(storage, {});

        expect(result.errors[0].message).toBe("First");
        expect(result.errors[1].message).toBe("Second");
        expect(result.errors[2].message).toBe("Third");
    });

    it("has correct tool definition", () => {
        expect(logsGetErrorsTool.name).toBe("logs_get_errors");
        expect(logsGetErrorsTool.description).toContain("ERROR");
    });
});
