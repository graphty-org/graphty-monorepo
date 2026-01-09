import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { LogStorage } from "../../src/server/log-storage.js";
import { createMcpServer, getToolNames } from "../../src/mcp/mcp-server.js";

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
