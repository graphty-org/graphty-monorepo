import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { LogStorage, type LogEntry } from "../../../src/server/log-storage.js";
import { logsGetRecentHandler } from "../../../src/mcp/tools/logs-get-recent.js";

describe("logs_get_recent tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(() => {
        storage.clear();
    });

    test("returns recent logs sorted by time", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "First" },
            { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "Third" },
            { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Second" },
        ]);

        const result = await logsGetRecentHandler(storage, {});

        expect(result.logs).toHaveLength(3);
        // Oldest first (chronological order)
        expect(result.logs[0].message).toBe("First");
        expect(result.logs[1].message).toBe("Second");
        expect(result.logs[2].message).toBe("Third");
    });

    test("respects count parameter (default 50, max 500)", async () => {
        // Add 100 logs
        const logs: LogEntry[] = [];
        for (let i = 0; i < 100; i++) {
            logs.push({
                time: new Date(Date.now() + i * 1000).toISOString(),
                level: "INFO",
                message: `Log ${i}`,
            });
        }
        storage.addLogs("session-1", logs);

        // Default should return 50
        const defaultResult = await logsGetRecentHandler(storage, {});
        expect(defaultResult.logs).toHaveLength(50);

        // Custom count
        const customResult = await logsGetRecentHandler(storage, { count: 10 });
        expect(customResult.logs).toHaveLength(10);

        // Max should be capped at 500
        const maxResult = await logsGetRecentHandler(storage, { count: 1000 });
        expect(maxResult.logs).toHaveLength(100); // Only 100 logs exist
    });

    test("filters by projectMarker", async () => {
        storage.addLogs(
            "session-a",
            [{ time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Project A" }],
            { projectMarker: "project-a" },
        );
        storage.addLogs(
            "session-b",
            [{ time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Project B" }],
            { projectMarker: "project-b" },
        );

        const result = await logsGetRecentHandler(storage, { projectMarker: "project-a" });

        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].message).toBe("Project A");
    });

    test("filters by workingDirectory (derives marker from path)", async () => {
        storage.addLogs(
            "session-a",
            [{ time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Remote logging" }],
            { projectMarker: "remote-logging" },
        );
        storage.addLogs(
            "session-b",
            [{ time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Other project" }],
            { projectMarker: "other" },
        );

        const result = await logsGetRecentHandler(storage, {
            workingDirectory: "/home/user/.worktrees/remote-logging",
        });

        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].message).toBe("Remote logging");
    });

    test("filters by level", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Info message" },
            { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Error message" },
            { time: "2024-01-15T10:00:02.000Z", level: "DEBUG", message: "Debug message" },
        ]);

        const result = await logsGetRecentHandler(storage, { level: "ERROR" });

        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].message).toBe("Error message");
    });

    test("filters by since timestamp", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Old" },
            { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "New" },
        ]);

        const result = await logsGetRecentHandler(storage, {
            since: "2024-01-15T10:00:01.000Z",
        });

        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].message).toBe("New");
    });

    test("returns empty array when no logs", async () => {
        const result = await logsGetRecentHandler(storage, {});

        expect(result.logs).toEqual([]);
        expect(result.count).toBe(0);
    });

    test("returns log count in result", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Test 2" },
        ]);

        const result = await logsGetRecentHandler(storage, {});

        expect(result.count).toBe(2);
    });
});
