/**
 * MCP server module exports.
 *
 * Provides Model Context Protocol interface for log queries.
 * @module mcp
 */

export { createMcpServer, getToolNames, startMcpServer } from "./mcp-server.js";

// Re-export all tool handlers, schemas, and definitions for programmatic use
export {
    // logs_get_file_path
    getLogFilePath,
    // logs_clear
    logsClearHandler,
    type LogsClearInput,
    logsClearInputSchema,
    type LogsClearOutput,
    logsClearTool,
    // logs_get_all
    logsGetAllHandler,
    type LogsGetAllInput,
    logsGetAllInputSchema,
    type LogsGetAllOutput,
    logsGetAllTool,
    // logs_get_errors
    logsGetErrorsHandler,
    type LogsGetErrorsInput,
    logsGetErrorsInputSchema,
    type LogsGetErrorsOutput,
    logsGetErrorsTool,
    logsGetFilePathHandler,
    type LogsGetFilePathInput,
    logsGetFilePathInputSchema,
    type LogsGetFilePathOutput,
    logsGetFilePathTool,
    // logs_get_recent
    logsGetRecentHandler,
    type LogsGetRecentInput,
    logsGetRecentInputSchema,
    type LogsGetRecentOutput,
    logsGetRecentTool,
    // logs_list_sessions
    logsListSessionsHandler,
    type LogsListSessionsInput,
    logsListSessionsInputSchema,
    type LogsListSessionsOutput,
    logsListSessionsTool,
    // logs_receive
    logsReceiveHandler,
    type LogsReceiveInput,
    logsReceiveInputSchema,
    type LogsReceiveOutput,
    logsReceiveTool,
    // logs_search
    logsSearchHandler,
    type LogsSearchInput,
    logsSearchInputSchema,
    type LogsSearchOutput,
    logsSearchTool,
    // logs_status
    logsStatusHandler,
    type LogsStatusInput,
    logsStatusInputSchema,
    type LogsStatusOutput,
    logsStatusTool,
} from "./tools/index.js";
