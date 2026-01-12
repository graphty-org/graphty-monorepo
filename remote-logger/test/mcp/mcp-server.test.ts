import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { LogStorage } from "../../src/server/log-storage.js";
import {
    createMcpServer,
    getToolNames,
    SERVER_INSTRUCTIONS,
} from "../../src/mcp/mcp-server.js";

describe("MCP Server", () => {
    let storage: LogStorage;

    beforeEach(() => {
        storage = new LogStorage();
    });

    afterEach(() => {
        storage.clear();
    });

    test("initializes with LogStorage", () => {
        const server = createMcpServer(storage);
        expect(server).toBeDefined();
    });

    test("registers tools with correct names", () => {
        createMcpServer(storage);
        const toolNames = getToolNames();

        expect(toolNames).toContain("logs_get_recent");
        expect(toolNames).toContain("logs_status");
        expect(toolNames).toContain("logs_list_sessions");
    });

    test("has all 9 tools registered", () => {
        createMcpServer(storage);
        const toolNames = getToolNames();

        expect(toolNames.length).toBe(9);
        expect(toolNames).toContain("logs_get_recent");
        expect(toolNames).toContain("logs_status");
        expect(toolNames).toContain("logs_list_sessions");
        expect(toolNames).toContain("logs_receive");
        expect(toolNames).toContain("logs_get_all");
        expect(toolNames).toContain("logs_get_errors");
        expect(toolNames).toContain("logs_clear");
        expect(toolNames).toContain("logs_search");
        expect(toolNames).toContain("logs_get_file_path");
    });
});

describe("SERVER_INSTRUCTIONS", () => {
    test("should document the correct /log endpoint path", () => {
        // Architecture diagram should reference /log not /logs for receiving logs
        expect(SERVER_INSTRUCTIONS).toContain("HTTP POST to /log →");

        // SDK example should show correct serverUrl (without /log path, since client appends it)
        expect(SERVER_INSTRUCTIONS).toContain('serverUrl: "http://localhost:9080"');
        expect(SERVER_INSTRUCTIONS).not.toContain('serverUrl: "http://localhost:9080/logs"');

        // Raw fetch() example should use /log endpoint
        expect(SERVER_INSTRUCTIONS).toContain('fetch("http://localhost:9080/log"');
        expect(SERVER_INSTRUCTIONS).not.toContain('fetch("http://localhost:9080/logs"');
    });
});
