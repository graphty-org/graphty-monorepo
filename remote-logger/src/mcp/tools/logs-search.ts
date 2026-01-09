/**
 * logs_search MCP tool implementation.
 *
 * Searches logs by substring or regex pattern.
 * @module mcp/tools/logs-search
 */

import * as z from "zod/v3";

import type { LogEntryWithSession, LogStorage } from "../../server/log-storage.js";

/**
 * Input schema for the logs_search tool.
 */
export const logsSearchInputSchema = z.object({
    /** The text pattern to search for in log messages. */
    query: z.string(),
    /** When true, treat query as a regular expression. Default: false (substring match). */
    regex: z.boolean().optional(),
    /** Filter results to a specific project identifier. Searches all projects if omitted. */
    projectMarker: z.string().optional(),
    /** Filter by log level (e.g., "INFO", "ERROR"). Case-sensitive. */
    level: z.string().optional(),
    /** Maximum number of results to return. Defaults to 100. Range: 1-1000. */
    limit: z.number().int().min(1).max(1000).optional(),
});

/**
 * Input type for the logs_search handler.
 */
export type LogsSearchInput = z.infer<typeof logsSearchInputSchema>;

/**
 * Output type for the logs_search handler.
 */
export interface LogsSearchOutput {
    /** Matching log entries */
    results: LogEntryWithSession[];
    /** Number of results returned */
    count: number;
    /** Error message if regex is invalid */
    error?: string;
}

/**
 * Handler for the logs_search tool.
 *
 * Searches log messages by substring (case-insensitive) or regex pattern.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Matching logs and count
 */
export function logsSearchHandler(
    storage: LogStorage,
    input: LogsSearchInput,
): Promise<LogsSearchOutput> {
    // Validate regex if provided
    if (input.regex) {
        try {
            new RegExp(input.query);
        } catch {
            return Promise.resolve({
                results: [],
                count: 0,
                error: `Invalid regex pattern: "${input.query}"`,
            });
        }
    }

    const results = storage.search({
        query: input.query,
        regex: input.regex,
        projectMarker: input.projectMarker,
        level: input.level,
        limit: input.limit ?? 100,
    });

    return Promise.resolve({
        results,
        count: results.length,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsSearchTool = {
    name: "logs_search",
    description:
        "Search logs by text pattern. " +
        "By default, searches are case-insensitive substrings (e.g., 'error' matches 'TypeError'). " +
        "Use regex: true for regex patterns (e.g., 'user:\\d+' to match 'user:123'). " +
        "More flexible than logs_get_errors when you need to find specific messages.",
    inputSchema: logsSearchInputSchema,
};
