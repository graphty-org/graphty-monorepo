import { describe, expect, test } from "vitest";

import * as mcpExports from "../../src/mcp/index.js";

describe("MCP exports", () => {
    test("should export all 9 tool handlers", () => {
        const expectedTools = [
            "logsGetRecent",
            "logsListSessions",
            "logsStatus",
            "logsClear",
            "logsGetAll",
            "logsGetErrors",
            "logsGetFilePath",
            "logsReceive",
            "logsSearch",
        ];

        for (const tool of expectedTools) {
            expect(mcpExports).toHaveProperty(`${tool}Handler`);
        }
    });

    test("should export all 9 tool definitions", () => {
        const expectedTools = [
            "logsGetRecent",
            "logsListSessions",
            "logsStatus",
            "logsClear",
            "logsGetAll",
            "logsGetErrors",
            "logsGetFilePath",
            "logsReceive",
            "logsSearch",
        ];

        for (const tool of expectedTools) {
            expect(mcpExports).toHaveProperty(`${tool}Tool`);
        }
    });

    test("should export all input schemas except logsStatus", () => {
        // All tools except logsStatus have input schemas
        const toolsWithSchema = [
            "logsGetRecent",
            "logsListSessions",
            "logsClear",
            "logsGetAll",
            "logsGetErrors",
            "logsGetFilePath",
            "logsReceive",
            "logsSearch",
        ];

        for (const tool of toolsWithSchema) {
            expect(mcpExports).toHaveProperty(`${tool}InputSchema`);
        }
    });

    test("should export MCP server creation functions", () => {
        expect(mcpExports).toHaveProperty("createMcpServer");
        expect(mcpExports).toHaveProperty("startMcpServer");
        expect(mcpExports).toHaveProperty("getToolNames");
    });
});
