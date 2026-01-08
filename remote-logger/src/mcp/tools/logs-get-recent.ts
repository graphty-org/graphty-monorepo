/**
 * logs_get_recent MCP tool implementation.
 *
 * Returns recent logs sorted by time with optional filtering.
 * @module mcp/tools/logs-get-recent
 */

import * as z from "zod/v3";

import type { LogEntryWithSession, LogFilter,LogStorage } from "../../server/log-storage.js";
import { resolveProjectMarker } from "../../server/marker-utils.js";

/**
 * Input schema for the logs_get_recent tool.
 * Note: We use a simple shape without .default() to be compatible with MCP SDK.
 */
export const logsGetRecentInputSchema = z.object({
    /** Number of logs to return. Defaults to 50. Range: 1-500. */
    count: z.number().int().min(1).max(500).optional(),
    /** Filter logs to a specific project. Derived from workingDirectory if not provided. */
    projectMarker: z.string().optional(),
    /** Directory path to derive project marker from. Ignored if projectMarker is set. */
    workingDirectory: z.string().optional(),
    /** Filter by log level (e.g., "INFO", "ERROR", "DEBUG"). Case-sensitive. */
    level: z.string().optional(),
    /** Return only logs after this timestamp. Format: ISO 8601 (e.g., "2025-01-08T12:00:00Z"). */
    since: z.string().optional(),
});

/**
 * Input type for the logs_get_recent handler.
 */
export type LogsGetRecentInput = z.infer<typeof logsGetRecentInputSchema>;

/**
 * Output type for the logs_get_recent handler.
 */
export interface LogsGetRecentOutput {
    logs: LogEntryWithSession[];
    count: number;
}

/**
 * Handler for the logs_get_recent tool.
 *
 * Returns recent logs sorted by time (oldest first), with optional filtering
 * by project marker, level, or timestamp.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Recent logs and count
 */
export function logsGetRecentHandler(
    storage: LogStorage,
    input: Partial<LogsGetRecentInput>,
): Promise<LogsGetRecentOutput> {
    // Apply defaults
    const requestedCount = input.count ?? 50;

    // Resolve project marker from input
    const projectMarker = resolveProjectMarker({
        projectMarker: input.projectMarker,
        workingDirectory: input.workingDirectory,
    });

    // Build filter
    const filter: LogFilter = {};

    if (projectMarker !== "default") {
        filter.projectMarker = projectMarker;
    }

    if (input.level) {
        filter.level = input.level;
    }

    if (input.since) {
        filter.since = input.since;
    }

    // Ensure count doesn't exceed 500
    const limitedCount = Math.min(requestedCount, 500);

    // Get recent logs
    const logs = storage.getRecentLogs(limitedCount, filter);

    return Promise.resolve({
        logs,
        count: logs.length,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsGetRecentTool = {
    name: "logs_get_recent",
    description:
        "Get recent logs from the remote log server, sorted by time (oldest first). " +
        "Use this to see the latest log output from browser applications. " +
        "This is the primary tool for viewing logs. " +
        "For error-only logs, use logs_get_errors instead. " +
        "For searching specific text, use logs_search.",
    inputSchema: logsGetRecentInputSchema,
};
