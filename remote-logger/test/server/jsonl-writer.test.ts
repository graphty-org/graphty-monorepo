/**
 * Tests for the JsonlWriter module.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonlWriter, type JsonlEntry } from "../../src/server/jsonl-writer.js";

describe("JsonlWriter", () => {
    let writer: JsonlWriter;
    let testBaseDir: string;

    beforeEach(() => {
        // Create a unique temp directory for each test
        testBaseDir = path.join(os.tmpdir(), `jsonl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        writer = new JsonlWriter(testBaseDir);
    });

    afterEach(async () => {
        // Close writer and clean up
        await writer.close();

        // Clean up test directory
        try {
            fs.rmSync(testBaseDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    it("creates directory structure: {baseDir}/{marker}/logs.jsonl", async () => {
        const entry: JsonlEntry = {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Test message",
            sessionId: "test-session",
        };

        await writer.write("my-project", entry);
        await writer.flush();

        const expectedDir = path.join(testBaseDir, "my-project");
        const expectedFile = path.join(expectedDir, "logs.jsonl");

        expect(fs.existsSync(expectedDir)).toBe(true);
        expect(fs.existsSync(expectedFile)).toBe(true);
    });

    it("appends log entries as JSON lines", async () => {
        const entries: JsonlEntry[] = [
            { time: "2024-01-15T10:00:00Z", level: "INFO", message: "First", sessionId: "s1" },
            { time: "2024-01-15T10:00:01Z", level: "DEBUG", message: "Second", sessionId: "s1" },
            { time: "2024-01-15T10:00:02Z", level: "ERROR", message: "Third", sessionId: "s1" },
        ];

        for (const entry of entries) {
            await writer.write("test-project", entry);
        }
        await writer.flush();

        const filePath = writer.getFilePath("test-project");
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        expect(lines.length).toBe(3);

        for (let i = 0; i < lines.length; i++) {
            const parsed = JSON.parse(lines[i]);
            expect(parsed.time).toBe(entries[i].time);
            expect(parsed.level).toBe(entries[i].level);
            expect(parsed.message).toBe(entries[i].message);
        }
    });

    it("handles concurrent writes safely", async () => {
        const marker = "concurrent-project";
        const writeCount = 100;

        // Fire off many concurrent writes
        const promises: Promise<void>[] = [];
        for (let i = 0; i < writeCount; i++) {
            promises.push(writer.write(marker, {
                time: new Date().toISOString(),
                level: "INFO",
                message: `Message ${i}`,
                sessionId: "test-session",
            }));
        }

        await Promise.all(promises);
        await writer.flush();

        const filePath = writer.getFilePath(marker);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        // All messages should be written
        expect(lines.length).toBe(writeCount);

        // Each line should be valid JSON
        for (const line of lines) {
            expect(() => JSON.parse(line)).not.toThrow();
        }
    });

    it("creates new file if not exists", async () => {
        const marker = "new-project";
        const filePath = writer.getFilePath(marker);

        // File should not exist initially
        expect(fs.existsSync(filePath)).toBe(false);

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "First log",
            sessionId: "s1",
        });
        await writer.flush();

        // Now file should exist
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it("flushes buffer on close", async () => {
        const marker = "flush-test";

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Should be flushed",
            sessionId: "s1",
        });

        // Close should flush
        await writer.close();

        const filePath = path.join(testBaseDir, marker, "logs.jsonl");
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).toContain("Should be flushed");
    });

    it("closes file handles on shutdown", async () => {
        await writer.write("test-project", {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Test",
            sessionId: "s1",
        });

        await writer.close();

        // Should be able to close multiple times without error
        await writer.close();
    });

    it("getFilePath returns correct path", () => {
        const filePath = writer.getFilePath("my-marker");

        expect(filePath).toBe(path.join(testBaseDir, "my-marker", "logs.jsonl"));
    });

    it("getFileStats returns null for non-existent file", () => {
        const stats = writer.getFileStats("nonexistent-project");

        expect(stats).toBeNull();
    });

    it("getFileStats returns stats for existing file", async () => {
        const marker = "stats-test";

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Test message for stats",
            sessionId: "s1",
        });
        await writer.flush();

        const stats = writer.getFileStats(marker);

        expect(stats).not.toBeNull();
        expect(stats!.exists).toBe(true);
        expect(stats!.size).toBeGreaterThan(0);
    });

    it("writes entries with optional data field", async () => {
        const marker = "data-field-test";

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "DEBUG",
            message: "With data",
            sessionId: "s1",
            data: { userId: 123, action: "click" },
        });
        await writer.flush();

        const filePath = writer.getFilePath(marker);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content.trim());

        expect(parsed.data).toEqual({ userId: 123, action: "click" });
    });

    it("handles special characters in project marker", async () => {
        // Markers should be sanitized or handled safely
        const marker = "project-with-dashes";

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Test",
            sessionId: "s1",
        });
        await writer.flush();

        const filePath = writer.getFilePath(marker);
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it("creates separate files per project marker", async () => {
        const markers = ["project-a", "project-b", "project-c"];

        for (const marker of markers) {
            await writer.write(marker, {
                time: new Date().toISOString(),
                level: "INFO",
                message: `Log for ${marker}`,
                sessionId: "s1",
            });
        }
        await writer.flush();

        // Each marker should have its own file
        for (const marker of markers) {
            const filePath = writer.getFilePath(marker);
            expect(fs.existsSync(filePath)).toBe(true);

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content).toContain(`Log for ${marker}`);
        }
    });

    it("appends to existing file on subsequent writes", async () => {
        const marker = "append-test";

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "First write",
            sessionId: "s1",
        });
        await writer.flush();

        await writer.write(marker, {
            time: new Date().toISOString(),
            level: "INFO",
            message: "Second write",
            sessionId: "s1",
        });
        await writer.flush();

        const filePath = writer.getFilePath(marker);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n");

        expect(lines.length).toBe(2);
        expect(content).toContain("First write");
        expect(content).toContain("Second write");
    });

    describe("cleanupOldFiles", () => {
        it("removes project directories older than retention days", async () => {
            const oldMarker = "old-project";
            const newMarker = "new-project";

            // Write to both projects
            await writer.write(oldMarker, {
                time: new Date().toISOString(),
                level: "INFO",
                message: "Old log",
                sessionId: "s1",
            });
            await writer.write(newMarker, {
                time: new Date().toISOString(),
                level: "INFO",
                message: "New log",
                sessionId: "s1",
            });
            await writer.flush();

            // Manually set old project directory mtime to 10 days ago
            const oldDir = path.join(testBaseDir, oldMarker);
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            fs.utimesSync(oldDir, tenDaysAgo, tenDaysAgo);

            // Run cleanup with 7 day retention
            const removed = writer.cleanupOldFiles(7);

            expect(removed).toBe(1);
            expect(fs.existsSync(path.join(testBaseDir, oldMarker))).toBe(false);
            expect(fs.existsSync(path.join(testBaseDir, newMarker))).toBe(true);
        });

        it("returns 0 when no files need cleanup", async () => {
            // Write a recent log
            await writer.write("recent-project", {
                time: new Date().toISOString(),
                level: "INFO",
                message: "Recent log",
                sessionId: "s1",
            });
            await writer.flush();

            const removed = writer.cleanupOldFiles(7);
            expect(removed).toBe(0);
        });

        it("handles empty base directory", () => {
            // No writes yet, directory is empty
            const removed = writer.cleanupOldFiles(7);
            expect(removed).toBe(0);
        });

        it("handles non-existent base directory", () => {
            // Close writer and delete base dir
            const emptyWriter = new JsonlWriter("/nonexistent/path/remote-logger");
            const removed = emptyWriter.cleanupOldFiles(7);
            expect(removed).toBe(0);
        });
    });
});
