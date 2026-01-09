import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { LogStorage } from "../../../src/server/log-storage.js";
import { logsStatusHandler } from "../../../src/mcp/tools/logs-status.js";

describe("logs_status tool", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(() => {
        storage.clear();
    });

    test("returns server status", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.status).toBe("ok");
    });

    test("returns uptime", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.uptimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof result.uptimeMs).toBe("number");
    });

    test("returns session count", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test" },
        ]);
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Test 2" },
        ]);

        const result = await logsStatusHandler(storage);

        expect(result.sessionCount).toBe(2);
    });

    test("returns log count", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Test 1" },
            { time: "2024-01-15T10:00:01.000Z", level: "INFO", message: "Test 2" },
        ]);
        storage.addLogs("session-2", [
            { time: "2024-01-15T10:00:02.000Z", level: "INFO", message: "Test 3" },
        ]);

        const result = await logsStatusHandler(storage);

        expect(result.totalLogs).toBe(3);
    });

    test("returns error count", async () => {
        storage.addLogs("session-1", [
            { time: "2024-01-15T10:00:00.000Z", level: "INFO", message: "Info" },
            { time: "2024-01-15T10:00:01.000Z", level: "ERROR", message: "Error 1" },
            { time: "2024-01-15T10:00:02.000Z", level: "ERROR", message: "Error 2" },
        ]);

        const result = await logsStatusHandler(storage);

        expect(result.totalErrors).toBe(2);
    });

    test("includes memory usage", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.memoryUsage).toBeDefined();
        expect(typeof result.memoryUsage.heapUsed).toBe("number");
        expect(typeof result.memoryUsage.heapTotal).toBe("number");
        expect(typeof result.memoryUsage.rss).toBe("number");
    });

    test("returns zero counts when no logs", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.sessionCount).toBe(0);
        expect(result.totalLogs).toBe(0);
        expect(result.totalErrors).toBe(0);
    });

    test("returns undefined server config when not set", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.server).toBeUndefined();
    });

    test("returns server config when set", async () => {
        storage.setServerConfig({
            httpPort: 9080,
            httpHost: "localhost",
            protocol: "http",
            httpEndpoint: "http://localhost:9080/log",
            mode: "dual",
        });

        const result = await logsStatusHandler(storage);

        expect(result.server).toBeDefined();
        expect(result.server?.httpPort).toBe(9080);
        expect(result.server?.httpHost).toBe("localhost");
        expect(result.server?.protocol).toBe("http");
        expect(result.server?.httpEndpoint).toBe("http://localhost:9080/log");
        expect(result.server?.mode).toBe("dual");
    });

    test("returns https server config", async () => {
        storage.setServerConfig({
            httpPort: 9443,
            httpHost: "localhost",
            protocol: "https",
            httpEndpoint: "https://localhost:9443/log",
            mode: "http-only",
        });

        const result = await logsStatusHandler(storage);

        expect(result.server?.protocol).toBe("https");
        expect(result.server?.httpEndpoint).toBe("https://localhost:9443/log");
        expect(result.server?.mode).toBe("http-only");
    });

    test("returns mcp-only mode", async () => {
        storage.setServerConfig({
            httpPort: 9080,
            httpHost: "localhost",
            protocol: "http",
            httpEndpoint: "http://localhost:9080/log",
            mode: "mcp-only",
        });

        const result = await logsStatusHandler(storage);

        expect(result.server?.mode).toBe("mcp-only");
    });

    test("returns retention days", async () => {
        const result = await logsStatusHandler(storage);

        expect(result.retentionDays).toBe(7); // default retention
        expect(typeof result.retentionDays).toBe("number");
    });

    test("returns custom retention days", async () => {
        const customStorage = new LogStorage({ retentionDays: 14 });

        const result = await logsStatusHandler(customStorage);

        expect(result.retentionDays).toBe(14);
    });
});
