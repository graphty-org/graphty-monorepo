import { describe, expect, test } from "vitest";

import type { LogEntry, RemoteLogClientOptions } from "../../src/client/types.js";

describe("types", () => {
    describe("LogEntry", () => {
        test("should have required fields", () => {
            const entry: LogEntry = {
                time: "2024-01-01T00:00:00.000Z",
                level: "INFO",
                message: "Test message",
            };

            expect(entry.time).toBe("2024-01-01T00:00:00.000Z");
            expect(entry.level).toBe("INFO");
            expect(entry.message).toBe("Test message");
            expect(entry.data).toBeUndefined();
        });

        test("should accept optional data field", () => {
            const entry: LogEntry = {
                time: "2024-01-01T00:00:00.000Z",
                level: "DEBUG",
                message: "Test with data",
                data: { userId: 123, action: "click" },
            };

            expect(entry.data).toEqual({ userId: 123, action: "click" });
        });

        test("should accept various log levels", () => {
            const levels = ["DEBUG", "INFO", "WARN", "ERROR", "TRACE", "FATAL"];

            for (const level of levels) {
                const entry: LogEntry = {
                    time: new Date().toISOString(),
                    level,
                    message: `Test ${level} message`,
                };
                expect(entry.level).toBe(level);
            }
        });
    });

    describe("RemoteLogClientOptions", () => {
        test("should accept serverUrl", () => {
            const options: RemoteLogClientOptions = {
                serverUrl: "http://localhost:9080",
            };

            expect(options.serverUrl).toBe("http://localhost:9080");
        });

        test("should accept all optional fields", () => {
            const options: RemoteLogClientOptions = {
                serverUrl: "https://logs.example.com",
                sessionPrefix: "myapp",
                batchIntervalMs: 2000,
                maxRetries: 5,
                retryDelayMs: 500,
            };

            expect(options.serverUrl).toBe("https://logs.example.com");
            expect(options.sessionPrefix).toBe("myapp");
            expect(options.batchIntervalMs).toBe(2000);
            expect(options.maxRetries).toBe(5);
            expect(options.retryDelayMs).toBe(500);
        });

        test("should work with https URLs", () => {
            const options: RemoteLogClientOptions = {
                serverUrl: "https://secure-logs.example.com:8443",
            };

            expect(options.serverUrl).toBe("https://secure-logs.example.com:8443");
        });
    });
});
