/**
 * logs_receive MCP tool implementation.
 *
 * Stores logs with session metadata for later retrieval.
 * @module mcp/tools/logs-receive
 */

import * as z from "zod/v3";

import type { LogStorage } from "../../server/log-storage.js";

/**
 * Schema for a single log entry.
 */
const logEntrySchema = z.object({
    /** When the log was created. Format: ISO 8601 (e.g., "2025-01-08T12:00:00Z"). */
    time: z.string(),
    /** Severity level (e.g., "INFO", "DEBUG", "WARN", "ERROR"). */
    level: z.string(),
    /** The log message text. */
    message: z.string(),
    /** Additional structured data to attach to the log entry. */
    data: z.record(z.unknown()).optional(),
});

/**
 * Input schema for the logs_receive tool.
 */
export const logsReceiveInputSchema = z.object({
    /** Unique identifier for this logging session. Links related logs together. */
    sessionId: z.string(),
    /** Array of log entries to store. At least one entry required. */
    logs: z.array(logEntrySchema),
    /** Project identifier for filtering. Derived from sessionId prefix if not provided. */
    projectMarker: z.string().optional(),
    /** Git worktree path for project identification. */
    worktreePath: z.string().optional(),
    /** URL of the page that generated these logs. */
    pageUrl: z.string().optional(),
});

/**
 * Input type for the logs_receive handler.
 */
export type LogsReceiveInput = z.infer<typeof logsReceiveInputSchema>;

/**
 * Output type for the logs_receive handler.
 */
interface LogsReceiveOutput {
    /** Whether the operation succeeded */
    success: boolean;
    /** Number of logs stored */
    count: number;
    /** The session ID used */
    sessionId: string;
}

/**
 * Handler for the logs_receive tool.
 *
 * Stores logs with session metadata. The project marker is derived from
 * the session ID prefix if not explicitly provided.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Success status, count, and session ID
 */
export function logsReceiveHandler(
    storage: LogStorage,
    input: LogsReceiveInput,
): Promise<LogsReceiveOutput> {
    storage.addLogs(input.sessionId, input.logs, {
        projectMarker: input.projectMarker,
        worktreePath: input.worktreePath,
        pageUrl: input.pageUrl,
    });

    return Promise.resolve({
        success: true,
        count: input.logs.length,
        sessionId: input.sessionId,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsReceiveTool = {
    name: "logs_receive",
    description:
        "Store logs from a browser or application session. " +
        "Logs are associated with a session ID and can be filtered by project marker. " +
        "This tool is called by browser clients to send logs to the server. " +
        "You typically don't need to call this directly - use it when manually testing log ingestion.",
    inputSchema: logsReceiveInputSchema,
};
