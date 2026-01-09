/**
 * logs_list_sessions MCP tool implementation.
 *
 * Lists all logging sessions with their metadata.
 * @module mcp/tools/logs-list-sessions
 */

import * as z from "zod/v3";

import type { LogStorage, SessionMetadata } from "../../server/log-storage.js";

/**
 * Input schema for the logs_list_sessions tool.
 */
export const logsListSessionsInputSchema = z.object({
    /** Filter sessions to a specific project identifier. */
    projectMarker: z.string().optional(),
    /** When true, only return sessions that contain error-level logs. */
    hasErrors: z.boolean().optional(),
});

/**
 * Input type for the logs_list_sessions handler.
 */
export type LogsListSessionsInput = z.infer<typeof logsListSessionsInputSchema>;

/**
 * Output type for the logs_list_sessions handler.
 */
export interface LogsListSessionsOutput {
    sessions: SessionMetadata[];
    count: number;
}

/**
 * Handler for the logs_list_sessions tool.
 *
 * Lists all logging sessions with their metadata including project marker,
 * log counts, error counts, and timestamps.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns List of sessions and count
 */
export function logsListSessionsHandler(
    storage: LogStorage,
    input: Partial<LogsListSessionsInput>,
): Promise<LogsListSessionsOutput> {
    // Get sessions with filter
    const sessions = storage.getSessions({
        projectMarker: input.projectMarker,
        hasErrors: input.hasErrors,
    });

    return Promise.resolve({
        sessions,
        count: sessions.length,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsListSessionsTool = {
    name: "logs_list_sessions",
    description:
        "List all logging sessions with their metadata. " +
        "Each session represents a browser tab or application instance. " +
        "Use this to discover active sessions before fetching their logs, " +
        "or to find sessions with errors using the hasErrors filter.",
    inputSchema: logsListSessionsInputSchema,
};
