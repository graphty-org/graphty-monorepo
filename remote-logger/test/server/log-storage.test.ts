import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { JsonlWriter } from "../../src/server/jsonl-writer.js";
import { LogStorage } from "../../src/server/log-storage.js";
import type { LogEntry } from "../../src/server/log-storage.js";

describe("LogStorage", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(() => {
        storage.clear();
    });

    describe("addLogs", () => {
        test("stores logs with session metadata", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test message" },
            ];

            storage.addLogs("session-123", logs);

            const sessions = storage.getSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe("session-123");
            expect(sessions[0].logCount).toBe(1);
        });

        test("extracts project marker from session ID prefix", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            ];

            storage.addLogs("graphty-element-1704067200000-abc123", logs);

            const sessions = storage.getSessions();
            expect(sessions[0].projectMarker).toBe("graphty-element");
        });

        test("uses explicit projectMarker when provided", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            ];

            storage.addLogs("session-123", logs, { projectMarker: "explicit-marker" });

            const sessions = storage.getSessions();
            expect(sessions[0].projectMarker).toBe("explicit-marker");
        });

        test("stores worktreePath when provided", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            ];

            storage.addLogs("session-123", logs, {
                worktreePath: "/home/user/.worktrees/remote-logging",
            });

            const sessions = storage.getSessions();
            expect(sessions[0].worktreePath).toBe("/home/user/.worktrees/remote-logging");
        });

        test("stores pageUrl when provided", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            ];

            storage.addLogs("session-123", logs, {
                pageUrl: "http://localhost:9020/",
            });

            const sessions = storage.getSessions();
            expect(sessions[0].pageUrl).toBe("http://localhost:9020/");
        });

        test("appends to existing session", () => {
            const logs1: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "First" },
            ];
            const logs2: LogEntry[] = [
                { time: "2024-01-15T10:00:01.000Z", level: "DEBUG", message: "Second" },
            ];

            storage.addLogs("session-123", logs1);
            storage.addLogs("session-123", logs2);

            const sessions = storage.getSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].logCount).toBe(2);
        });

        test("tracks firstLogTime and lastLogTime", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "First" },
                { time: "2024-01-15T10:00:05.000Z", level: "INFO", message: "Last" },
            ];

            storage.addLogs("session-123", logs);

            const sessions = storage.getSessions();
            expect(sessions[0].firstLogTime).toBe("2024-01-15T10:00:00.000Z");
            expect(sessions[0].lastLogTime).toBe("2024-01-15T10:00:05.000Z");
        });

        test("tracks error count", () => {
            const logs: LogEntry[] = [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Info" },
                { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Error 1" },
                { time: "2024-01-15T10:00:02.000Z", level: "WARN", message: "Warn" },
                { time: "2024-01-15T10:00:03.000Z", level: "ERROR", message: "Error 2" },
            ];

            storage.addLogs("session-123", logs);

            const sessions = storage.getSessions();
            expect(sessions[0].errorCount).toBe(2);
        });
    });

    describe("getLogs", () => {
        beforeEach(() => {
            // Set up test data
            storage.addLogs(
                "app-a-123-abc",
                [
                    { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "App A Info" },
                    { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "App A Error" },
                ],
                { projectMarker: "project-a" },
            );
            storage.addLogs(
                "app-b-456-def",
                [
                    { time: "2024-01-15T10:00:02.000Z", level: "DEBUG", message: "App B Debug" },
                    { time: "2024-01-15T10:00:03.000Z", level: "WARN", message: "App B Warn" },
                ],
                { projectMarker: "project-b" },
            );
        });

        test("returns all logs when no filter provided", () => {
            const logs = storage.getLogs();
            expect(logs).toHaveLength(4);
        });

        test("filters by project marker", () => {
            const logs = storage.getLogs({ projectMarker: "project-a" });
            expect(logs).toHaveLength(2);
            expect(logs.every((l) => l.message.includes("App A"))).toBe(true);
        });

        test("filters by session ID", () => {
            const logs = storage.getLogs({ sessionId: "app-a-123-abc" });
            expect(logs).toHaveLength(2);
            expect(logs.every((l) => l.message.includes("App A"))).toBe(true);
        });

        test("filters by level", () => {
            const logs = storage.getLogs({ level: "ERROR" });
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("App A Error");
        });

        test("includes session ID in returned logs", () => {
            const logs = storage.getLogs();
            expect(logs[0]).toHaveProperty("sessionId");
        });
    });

    describe("getRecentLogs", () => {
        beforeEach(() => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Log 1" },
                { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Log 2" },
                { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "Log 3" },
                { time: "2024-01-15T10:00:03.000Z", level: "INFO", message: "Log 4" },
                { time: "2024-01-15T10:00:04.000Z", level: "INFO", message: "Log 5" },
            ]);
        });

        test("returns logs sorted by time (oldest first)", () => {
            const logs = storage.getRecentLogs(3);
            expect(logs).toHaveLength(3);
            expect(logs[0].message).toBe("Log 3");
            expect(logs[1].message).toBe("Log 4");
            expect(logs[2].message).toBe("Log 5");
        });

        test("respects count parameter", () => {
            const logs = storage.getRecentLogs(2);
            expect(logs).toHaveLength(2);
        });

        test("returns all logs if count exceeds total", () => {
            const logs = storage.getRecentLogs(100);
            expect(logs).toHaveLength(5);
        });

        test("applies filters before limiting", () => {
            storage.addLogs("session-2", [
                { time: "2024-01-15T10:00:05.000Z", level: "ERROR", message: "Error log" },
            ]);

            const logs = storage.getRecentLogs(10, { level: "ERROR" });
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("Error log");
        });
    });

    describe("getErrors", () => {
        beforeEach(() => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Info" },
                { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Error 1" },
                { time: "2024-01-15T10:00:02.000Z", level: "WARN", message: "Warn" },
                { time: "2024-01-15T10:00:03.000Z", level: "ERROR", message: "Error 2" },
            ]);
        });

        test("returns only ERROR level logs", () => {
            const errors = storage.getErrors();
            expect(errors).toHaveLength(2);
            expect(errors.every((e) => e.level === "ERROR")).toBe(true);
        });

        test("sorts errors chronologically", () => {
            const errors = storage.getErrors();
            expect(errors[0].message).toBe("Error 1");
            expect(errors[1].message).toBe("Error 2");
        });

        test("filters by project marker", () => {
            storage.addLogs(
                "session-2",
                [{ time: "2024-01-15T10:00:04.000Z", level: "ERROR", message: "Other error" }],
                { projectMarker: "other-project" },
            );

            const errors = storage.getErrors({ projectMarker: "session" });
            expect(errors).toHaveLength(2);
        });

        test("filters by since timestamp", () => {
            const errors = storage.getErrors({ since: "2024-01-15T10:00:02.000Z" });
            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe("Error 2");
        });
    });

    describe("getSessions", () => {
        beforeEach(() => {
            storage.addLogs(
                "session-a",
                [
                    { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "A info" },
                    { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "A error" },
                ],
                { projectMarker: "project-a" },
            );
            storage.addLogs(
                "session-b",
                [{ time: "2024-01-15T10:00:02.000Z", level: "DEBUG", message: "B debug" }],
                { projectMarker: "project-b" },
            );
        });

        test("lists all sessions with metadata", () => {
            const sessions = storage.getSessions();
            expect(sessions).toHaveLength(2);
        });

        test("includes all metadata fields", () => {
            const sessions = storage.getSessions();
            const sessionA = sessions.find((s) => s.sessionId === "session-a");

            expect(sessionA).toBeDefined();
            expect(sessionA?.projectMarker).toBe("project-a");
            expect(sessionA?.logCount).toBe(2);
            expect(sessionA?.errorCount).toBe(1);
            expect(sessionA?.firstLogTime).toBe("2024-01-15T10:00:00.000Z");
            expect(sessionA?.lastLogTime).toBe("2024-01-15T10:00:01.000Z");
        });

        test("filters by project marker", () => {
            const sessions = storage.getSessions({ projectMarker: "project-a" });
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe("session-a");
        });

        test("filters by hasErrors", () => {
            const sessions = storage.getSessions({ hasErrors: true });
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe("session-a");
        });
    });

    describe("clearLogs", () => {
        beforeEach(() => {
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
            storage.addLogs(
                "session-c",
                [{ time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "C" }],
                { projectMarker: "project-a" },
            );
        });

        test("clears all logs when no filter", () => {
            const result = storage.clearLogs();
            expect(result.cleared).toBe(3);
            expect(storage.getSessions()).toHaveLength(0);
        });

        test("clears only matching project marker", () => {
            const result = storage.clearLogs({ projectMarker: "project-a" });
            expect(result.cleared).toBe(2);

            const sessions = storage.getSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe("session-b");
        });

        test("clears only matching session ID", () => {
            const result = storage.clearLogs({ sessionId: "session-a" });
            expect(result.cleared).toBe(1);

            const sessions = storage.getSessions();
            expect(sessions).toHaveLength(2);
            expect(sessions.find((s) => s.sessionId === "session-a")).toBeUndefined();
        });
    });

    describe("getHealth", () => {
        test("returns health status with session count", () => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
            ]);

            const health = storage.getHealth();
            expect(health.status).toBe("ok");
            expect(health.sessionCount).toBe(1);
        });

        test("returns total log count", () => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test 1" },
                { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Test 2" },
            ]);
            storage.addLogs("session-2", [
                { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "Test 3" },
            ]);

            const health = storage.getHealth();
            expect(health.totalLogs).toBe(3);
        });

        test("returns total error count", () => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "ERROR", message: "Error 1" },
                { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Info" },
                { time: "2024-01-15T10:00:02.000Z", level: "ERROR", message: "Error 2" },
            ]);

            const health = storage.getHealth();
            expect(health.totalErrors).toBe(2);
        });

        test("returns uptime", () => {
            const health = storage.getHealth();
            expect(health.uptimeMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("getLogsForSession", () => {
        test("returns logs for a specific session", () => {
            storage.addLogs("session-a", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "A1" },
                { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "A2" },
            ]);
            storage.addLogs("session-b", [
                { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "B1" },
            ]);

            const logs = storage.getLogsForSession("session-a");
            expect(logs).toHaveLength(2);
            expect(logs[0].message).toBe("A1");
            expect(logs[1].message).toBe("A2");
        });

        test("returns empty array for non-existent session", () => {
            const logs = storage.getLogsForSession("non-existent");
            expect(logs).toHaveLength(0);
        });
    });

    describe("getAllLogsBySession", () => {
        test("returns all logs grouped by session ID", () => {
            storage.addLogs("session-a", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "A" },
            ]);
            storage.addLogs("session-b", [
                { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "B" },
            ]);

            const allLogs = storage.getAllLogsBySession();
            expect(Object.keys(allLogs)).toHaveLength(2);
            expect(allLogs["session-a"]).toHaveLength(1);
            expect(allLogs["session-b"]).toHaveLength(1);
        });

        test("filters by project marker", () => {
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

            const allLogs = storage.getAllLogsBySession({ projectMarker: "project-a" });
            expect(Object.keys(allLogs)).toHaveLength(1);
            expect(allLogs["session-a"]).toBeDefined();
        });
    });

    describe("search", () => {
        beforeEach(() => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "User logged in" },
                { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Connection failed" },
                { time: "2024-01-15T10:00:02.000Z", level: "DEBUG", message: "Processing request" },
            ]);
        });

        test("searches by substring (case-insensitive)", () => {
            const results = storage.search({ query: "user" });
            expect(results).toHaveLength(1);
            expect(results[0].message).toBe("User logged in");
        });

        test("searches by regex when regex flag is true", () => {
            const results = storage.search({ query: "^User.*in$", regex: true });
            expect(results).toHaveLength(1);
            expect(results[0].message).toBe("User logged in");
        });

        test("filters by project marker", () => {
            storage.addLogs(
                "session-2",
                [{ time: "2024-01-15T10:00:03.000Z", level: "INFO", message: "User in other project" }],
                { projectMarker: "other" },
            );

            const results = storage.search({ query: "user", projectMarker: "session" });
            expect(results).toHaveLength(1);
        });

        test("filters by level", () => {
            const results = storage.search({ query: "failed", level: "ERROR" });
            expect(results).toHaveLength(1);
        });

        test("respects limit", () => {
            storage.addLogs("session-1", [
                { time: "2024-01-15T10:00:03.000Z", level: "INFO", message: "User action 1" },
                { time: "2024-01-15T10:00:04.000Z", level: "INFO", message: "User action 2" },
            ]);

            const results = storage.search({ query: "user", limit: 2 });
            expect(results).toHaveLength(2);
        });

        test("returns empty array for no matches", () => {
            const results = storage.search({ query: "nonexistent" });
            expect(results).toHaveLength(0);
        });

        test("handles invalid regex gracefully", () => {
            const results = storage.search({ query: "[invalid", regex: true });
            expect(results).toHaveLength(0);
        });
    });

    describe("Log retention", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        test("removes logs older than retention period", () => {
            // Create storage with 1 day retention
            const retentionStorage = new LogStorage({ retentionDays: 1 });

            // Set time to 3 days ago
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            retentionStorage.addLogs("old-session", [
                { time: threeDaysAgo.toISOString(), level: "INFO", message: "Old log" },
            ]);

            // Add a recent log
            retentionStorage.addLogs("new-session", [
                { time: new Date().toISOString(), level: "INFO", message: "New log" },
            ]);

            // Run cleanup
            const removed = retentionStorage.cleanupExpiredLogs();

            // Old session should be removed
            expect(removed).toBe(1);
            const sessions = retentionStorage.getSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].sessionId).toBe("new-session");

            retentionStorage.stopCleanupTimer();
        });

        test("respects REMOTE_LOG_RETENTION_DAYS env var", () => {
            // Save original env
            const originalEnv = process.env.REMOTE_LOG_RETENTION_DAYS;

            // Set env var
            process.env.REMOTE_LOG_RETENTION_DAYS = "3";

            const envStorage = new LogStorage();
            expect(envStorage.getRetentionDays()).toBe(3);

            // Restore env
            if (originalEnv === undefined) {
                delete process.env.REMOTE_LOG_RETENTION_DAYS;
            } else {
                process.env.REMOTE_LOG_RETENTION_DAYS = originalEnv;
            }

            envStorage.stopCleanupTimer();
        });

        test("default retention is 7 days", () => {
            // Save original env
            const originalEnv = process.env.REMOTE_LOG_RETENTION_DAYS;
            delete process.env.REMOTE_LOG_RETENTION_DAYS;

            const defaultStorage = new LogStorage();
            expect(defaultStorage.getRetentionDays()).toBe(7);

            // Restore env
            if (originalEnv !== undefined) {
                process.env.REMOTE_LOG_RETENTION_DAYS = originalEnv;
            }

            defaultStorage.stopCleanupTimer();
        });

        test("retention check runs periodically", () => {
            // Create storage with short cleanup interval for testing
            const periodicStorage = new LogStorage({
                retentionDays: 1,
                cleanupIntervalMs: 100, // 100ms for fast test
            });

            // Add old log
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            periodicStorage.addLogs("old-session", [
                { time: twoDaysAgo.toISOString(), level: "INFO", message: "Old log" },
            ]);

            // Verify session exists initially
            expect(periodicStorage.getSessions()).toHaveLength(1);

            // Advance time to trigger cleanup
            vi.advanceTimersByTime(150);

            // Old session should be cleaned up
            expect(periodicStorage.getSessions()).toHaveLength(0);

            periodicStorage.stopCleanupTimer();
        });

        test("partial session cleanup removes only old logs", () => {
            const retentionStorage = new LogStorage({ retentionDays: 1 });

            // Add old log first
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            retentionStorage.addLogs("mixed-session", [
                { time: twoDaysAgo.toISOString(), level: "INFO", message: "Old log" },
            ]);

            // Add recent log to same session
            retentionStorage.addLogs("mixed-session", [
                { time: new Date().toISOString(), level: "INFO", message: "New log" },
            ]);

            // Run cleanup
            retentionStorage.cleanupExpiredLogs();

            // Session should still exist because it has recent activity
            const sessions = retentionStorage.getSessions();
            expect(sessions).toHaveLength(1);

            // But old log should be removed
            const logs = retentionStorage.getLogsForSession("mixed-session");
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("New log");

            retentionStorage.stopCleanupTimer();
        });

        test("cleanup updates session metadata correctly", () => {
            const retentionStorage = new LogStorage({ retentionDays: 1 });

            // Add old error log
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            retentionStorage.addLogs("mixed-session", [
                { time: twoDaysAgo.toISOString(), level: "ERROR", message: "Old error" },
            ]);

            // Add recent info log
            const recentTime = new Date().toISOString();
            retentionStorage.addLogs("mixed-session", [
                { time: recentTime, level: "INFO", message: "New log" },
            ]);

            // Run cleanup
            retentionStorage.cleanupExpiredLogs();

            const session = retentionStorage.getSessionMetadata("mixed-session");
            expect(session).toBeDefined();
            expect(session!.logCount).toBe(1);
            expect(session!.errorCount).toBe(0); // Old error was removed
            expect(session!.firstLogTime).toBe(recentTime);
            expect(session!.lastLogTime).toBe(recentTime);

            retentionStorage.stopCleanupTimer();
        });

        test("stopCleanupTimer stops periodic cleanup", () => {
            const periodicStorage = new LogStorage({
                retentionDays: 1,
                cleanupIntervalMs: 100,
            });

            // Add old log
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            periodicStorage.addLogs("old-session", [
                { time: twoDaysAgo.toISOString(), level: "INFO", message: "Old log" },
            ]);

            // Stop the timer
            periodicStorage.stopCleanupTimer();

            // Advance time
            vi.advanceTimersByTime(200);

            // Session should still exist because timer was stopped
            expect(periodicStorage.getSessions()).toHaveLength(1);
        });

        test("cleanupExpiredLogs is idempotent", () => {
            const retentionStorage = new LogStorage({ retentionDays: 1 });

            // Add recent log
            retentionStorage.addLogs("session-1", [
                { time: new Date().toISOString(), level: "INFO", message: "Recent log" },
            ]);

            // Run cleanup multiple times
            const removed1 = retentionStorage.cleanupExpiredLogs();
            const removed2 = retentionStorage.cleanupExpiredLogs();
            const removed3 = retentionStorage.cleanupExpiredLogs();

            expect(removed1).toBe(0);
            expect(removed2).toBe(0);
            expect(removed3).toBe(0);

            // Session should still exist
            expect(retentionStorage.getSessions()).toHaveLength(1);

            retentionStorage.stopCleanupTimer();
        });

        test("retention applies to both memory and JSONL files", async () => {
            // Create temp directory for JSONL files
            const testBaseDir = path.join(
                os.tmpdir(),
                `log-storage-retention-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );

            const jsonlWriter = new JsonlWriter(testBaseDir);
            const retentionStorage = new LogStorage({
                retentionDays: 1,
                jsonlWriter,
            });

            // Add old log
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            retentionStorage.addLogs("old-session", [
                { time: twoDaysAgo.toISOString(), level: "INFO", message: "Old log" },
            ], { projectMarker: "old-project" });

            // Add recent log
            retentionStorage.addLogs("new-session", [
                { time: new Date().toISOString(), level: "INFO", message: "New log" },
            ], { projectMarker: "new-project" });

            // Wait for JSONL writes
            await jsonlWriter.flush();

            // Verify both project directories exist
            expect(fs.existsSync(path.join(testBaseDir, "old-project"))).toBe(true);
            expect(fs.existsSync(path.join(testBaseDir, "new-project"))).toBe(true);

            // Set old project directory mtime to 2 days ago
            const oldDir = path.join(testBaseDir, "old-project");
            fs.utimesSync(oldDir, twoDaysAgo, twoDaysAgo);

            // Run cleanup
            retentionStorage.cleanupExpiredLogs();

            // Memory should be cleaned
            const sessions = retentionStorage.getSessions();
            expect(sessions).toHaveLength(1);
            expect(sessions[0].projectMarker).toBe("new-project");

            // JSONL files should be cleaned
            expect(fs.existsSync(path.join(testBaseDir, "old-project"))).toBe(false);
            expect(fs.existsSync(path.join(testBaseDir, "new-project"))).toBe(true);

            // Cleanup
            retentionStorage.stopCleanupTimer();
            await jsonlWriter.close();
            try {
                fs.rmSync(testBaseDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        });
    });
});
