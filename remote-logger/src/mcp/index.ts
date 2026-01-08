/**
 * MCP server module exports.
 *
 * Provides Model Context Protocol interface for log queries.
 * @module mcp
 */

export { createMcpServer, getToolNames, startMcpServer } from "./mcp-server.js";
export {
    logsGetRecentHandler,
    type LogsGetRecentInput,
    logsGetRecentInputSchema,
    type LogsGetRecentOutput,
    logsGetRecentTool,
    logsListSessionsHandler,
    type LogsListSessionsInput,
    logsListSessionsInputSchema,
    type LogsListSessionsOutput,
    logsListSessionsTool,
    logsStatusHandler,
    type LogsStatusInput,
    logsStatusInputSchema,
    type LogsStatusOutput,
    logsStatusTool,
} from "./tools/index.js";
