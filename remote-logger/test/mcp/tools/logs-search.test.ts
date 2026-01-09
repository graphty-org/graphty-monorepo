/**
 * Tests for the logs_search MCP tool.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import {
    logsSearchHandler,
    logsSearchTool,
} from "../../../src/mcp/tools/logs-search.js";

describe("logs_search tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
        // Add some test data
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "User logged in successfully" },
            { time: "2024-01-15T10:01:00Z", level: "ERROR", message: "Connection timeout error" },
            { time: "2024-01-15T10:02:00Z", level: "INFO", message: "User logged out" },
        ], { projectMarker: "project-a" });
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:03:00Z", level: "WARN", message: "High memory usage" },
            { time: "2024-01-15T10:04:00Z", level: "ERROR", message: "Out of memory error" },
        ], { projectMarker: "project-b" });
    });

    it("searches by substring (case-insensitive)", async () => {
        const result = await logsSearchHandler(storage, {
            query: "user",
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.some(r => r.message.includes("logged in"))).toBe(true);
        expect(result.results.some(r => r.message.includes("logged out"))).toBe(true);
    });

    it("searches by regex when regex: true", async () => {
        const result = await logsSearchHandler(storage, {
            query: "error$",
            regex: true,
        });

        expect(result.results).toHaveLength(2);
        expect(result.results[0].message).toContain("error");
    });

    it("filters by projectMarker", async () => {
        const result = await logsSearchHandler(storage, {
            query: "error",
            projectMarker: "project-a",
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].message).toBe("Connection timeout error");
    });

    it("filters by level", async () => {
        const result = await logsSearchHandler(storage, {
            query: "error",
            level: "ERROR",
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.every(r => r.level === "ERROR")).toBe(true);
    });

    it("respects limit (default 100)", async () => {
        // Add many logs
        const logs = [];
        for (let i = 0; i < 150; i++) {
            logs.push({
                time: `2024-01-15T10:${String(i).padStart(2, "0")}:00Z`,
                level: "INFO",
                message: `Log message ${i}`,
            });
        }
        storage.addLogs("session-many", logs);

        const result = await logsSearchHandler(storage, {
            query: "message",
        });

        expect(result.results.length).toBeLessThanOrEqual(100);
    });

    it("respects custom limit", async () => {
        const result = await logsSearchHandler(storage, {
            query: "error",
            limit: 1,
        });

        expect(result.results).toHaveLength(1);
    });

    it("handles invalid regex gracefully", async () => {
        const result = await logsSearchHandler(storage, {
            query: "[invalid(regex",
            regex: true,
        });

        expect(result.results).toHaveLength(0);
        expect(result.error).toContain("Invalid regex");
    });

    it("returns empty array when no matches", async () => {
        const result = await logsSearchHandler(storage, {
            query: "nonexistent_string_xyz",
        });

        expect(result.results).toHaveLength(0);
        expect(result.count).toBe(0);
    });

    it("has correct tool definition", () => {
        expect(logsSearchTool.name).toBe("logs_search");
        expect(logsSearchTool.description).toContain("Search");
    });
});
