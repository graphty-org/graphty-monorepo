/**
 * logs_get_all MCP tool implementation.
 *
 * Returns all logs grouped by session.
 * @module mcp/tools/logs-get-all
 */

import * as z from "zod/v3";

import type { LogEntry, LogStorage } from "../../server/log-storage.js";

/**
 * Input schema for the logs_get_all tool.
 */
export const logsGetAllInputSchema = z.object({
    /** Filter results to a specific project identifier. Returns all projects if omitted. */
    projectMarker: z.string().optional(),
});

/**
 * Input type for the logs_get_all handler.
 */
export type LogsGetAllInput = z.infer<typeof logsGetAllInputSchema>;

/**
 * Output type for the logs_get_all handler.
 */
export interface LogsGetAllOutput {
    /** Logs grouped by session ID */
    sessions: Record<string, LogEntry[]>;
    /** Number of sessions */
    sessionCount: number;
    /** Total number of logs across all sessions */
    totalLogs: number;
}

/**
 * Handler for the logs_get_all tool.
 *
 * Returns all logs grouped by session ID, with optional filtering by
 * project marker.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Logs grouped by session
 */
export function logsGetAllHandler(
    storage: LogStorage,
    input: Partial<LogsGetAllInput>,
): Promise<LogsGetAllOutput> {
    const sessions = storage.getAllLogsBySession({
        projectMarker: input.projectMarker,
    });

    // Calculate totals
    let totalLogs = 0;
    for (const logs of Object.values(sessions)) {
        totalLogs += logs.length;
    }

    return Promise.resolve({
        sessions,
        sessionCount: Object.keys(sessions).length,
        totalLogs,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsGetAllTool = {
    name: "logs_get_all",
    description:
        "Get all logs grouped by session. " +
        "Use this to see a complete view of logging activity across all browser sessions. " +
        "Returns logs organized by session ID, making it easy to trace activity per browser tab. " +
        "For a flat list of recent logs, use logs_get_recent instead.",
    inputSchema: logsGetAllInputSchema,
};
