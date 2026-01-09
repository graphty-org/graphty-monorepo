import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import { logsListSessionsHandler } from "../../../src/mcp/tools/logs-list-sessions.js";

describe("logs_list_sessions tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(() => {
        storage.clear();
    });

    test("lists all sessions with metadata", async () => {
        storage.addLogs("session-a", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test A" },
        ]);
        storage.addLogs("session-b", [
            { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Test B" },
        ]);

        const result = await logsListSessionsHandler(storage, {});

        expect(result.sessions).toHaveLength(2);
        expect(result.count).toBe(2);

        const sessionA = result.sessions.find((s) => s.sessionId === "session-a");
        const sessionB = result.sessions.find((s) => s.sessionId === "session-b");

        expect(sessionA).toBeDefined();
        expect(sessionA?.logCount).toBe(1);
        expect(sessionA?.errorCount).toBe(0);

        expect(sessionB).toBeDefined();
        expect(sessionB?.logCount).toBe(1);
        expect(sessionB?.errorCount).toBe(1);
    });

    test("includes all session metadata fields", async () => {
        storage.addLogs(
            "session-1",
            [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "First" },
                { time: "2024-01-15T10:00:05.000Z", level: "ERROR", message: "Last" },
            ],
            { projectMarker: "test-project", worktreePath: "/path/to/.worktrees/test-project" },
        );

        const result = await logsListSessionsHandler(storage, {});

        expect(result.sessions).toHaveLength(1);
        const session = result.sessions[0];

        expect(session.sessionId).toBe("session-1");
        expect(session.projectMarker).toBe("test-project");
        expect(session.worktreePath).toBe("/path/to/.worktrees/test-project");
        expect(session.firstLogTime).toBe("2024-01-15T10:00:00.000Z");
        expect(session.lastLogTime).toBe("2024-01-15T10:00:05.000Z");
        expect(session.logCount).toBe(2);
        expect(session.errorCount).toBe(1);
    });

    test("filters by projectMarker", async () => {
        storage.addLogs(
            "session-a",
            [{ time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "A" }],
            { projectMarker: "project-a" },
        );
        storage.addLogs(
            "session-b",
            [{ time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "B" }],
            { projectMarker: "project-b" },
        );

        const result = await logsListSessionsHandler(storage, { projectMarker: "project-a" });

        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].sessionId).toBe("session-a");
        expect(result.count).toBe(1);
    });

    test("filters by hasErrors", async () => {
        storage.addLogs("session-no-errors", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "OK" },
        ]);
        storage.addLogs("session-with-errors", [
            { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Bad" },
        ]);

        const result = await logsListSessionsHandler(storage, { hasErrors: true });

        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].sessionId).toBe("session-with-errors");
    });

    test("returns empty array when no sessions", async () => {
        const result = await logsListSessionsHandler(storage, {});

        expect(result.sessions).toEqual([]);
        expect(result.count).toBe(0);
    });

    test("combines filters", async () => {
        storage.addLogs(
            "session-a",
            [{ time: "2024-01-15T10:00:00.000Z", level: "ERROR", message: "A error" }],
            { projectMarker: "project-a" },
        );
        storage.addLogs(
            "session-b",
            [{ time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "A info" }],
            { projectMarker: "project-a" },
        );
        storage.addLogs(
            "session-c",
            [{ time: "2024-01-15T10:00:02.000Z", level: "ERROR", message: "B error" }],
            { projectMarker: "project-b" },
        );

        const result = await logsListSessionsHandler(storage, {
            projectMarker: "project-a",
            hasErrors: true,
        });

        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].sessionId).toBe("session-a");
    });
});
