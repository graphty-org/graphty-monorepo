/**
 * logs_get_errors MCP tool implementation.
 *
 * Returns only ERROR level logs.
 * @module mcp/tools/logs-get-errors
 */

import * as z from "zod/v3";

import type { LogEntryWithSession, LogStorage } from "../../server/log-storage.js";

/**
 * Input schema for the logs_get_errors tool.
 */
export const logsGetErrorsInputSchema = z.object({
    /** Filter errors to a specific project identifier. Returns all projects if omitted. */
    projectMarker: z.string().optional(),
    /** Return only errors after this timestamp. Format: ISO 8601 (e.g., "2025-01-08T12:00:00Z"). */
    since: z.string().optional(),
});

/**
 * Input type for the logs_get_errors handler.
 */
export type LogsGetErrorsInput = z.infer<typeof logsGetErrorsInputSchema>;

/**
 * Output type for the logs_get_errors handler.
 */
interface LogsGetErrorsOutput {
    /** Array of ERROR level log entries */
    errors: LogEntryWithSession[];
    /** Number of errors returned */
    count: number;
}

/**
 * Handler for the logs_get_errors tool.
 *
 * Returns only ERROR level logs, sorted chronologically.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Error logs and count
 */
export function logsGetErrorsHandler(
    storage: LogStorage,
    input: Partial<LogsGetErrorsInput>,
): Promise<LogsGetErrorsOutput> {
    const errors = storage.getErrors({
        projectMarker: input.projectMarker,
        since: input.since,
    });

    return Promise.resolve({
        errors,
        count: errors.length,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsGetErrorsTool = {
    name: "logs_get_errors",
    description:
        "Get only ERROR level logs. " +
        "Use this to quickly find error messages across all sessions. " +
        "This is faster and more focused than logs_get_recent when you only need errors. " +
        "Results are sorted chronologically.",
    inputSchema: logsGetErrorsInputSchema,
};
