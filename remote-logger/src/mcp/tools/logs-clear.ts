/**
 * logs_clear MCP tool implementation.
 *
 * Clears logs with confirmation requirement for safety.
 * @module mcp/tools/logs-clear
 */

import * as z from "zod/v3";

import type { LogStorage } from "../../server/log-storage.js";

/**
 * Input schema for the logs_clear tool.
 */
export const logsClearInputSchema = z.object({
    /** Safety flag: must be set to true for the operation to proceed. Prevents accidental deletion. */
    confirm: z.boolean().optional(),
    /** Clear only logs for this project. Clears all projects if omitted. */
    projectMarker: z.string().optional(),
    /** Clear only logs for this specific session. Clears all sessions if omitted. */
    sessionId: z.string().optional(),
});

/**
 * Input type for the logs_clear handler.
 */
export type LogsClearInput = z.infer<typeof logsClearInputSchema>;

/**
 * Output type for the logs_clear handler.
 */
interface LogsClearOutput {
    /** Whether the operation succeeded */
    success: boolean;
    /** Number of sessions cleared */
    cleared: number;
    /** Error message if operation failed */
    error?: string;
}

/**
 * Handler for the logs_clear tool.
 *
 * Clears logs with optional filtering. Requires explicit confirmation
 * to prevent accidental data loss.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns Success status and count of cleared sessions
 */
export function logsClearHandler(
    storage: LogStorage,
    input: Partial<LogsClearInput>,
): Promise<LogsClearOutput> {
    // Require explicit confirmation
    if (input.confirm !== true) {
        return Promise.resolve({
            success: false,
            cleared: 0,
            error: "Operation requires confirm: true to proceed. This prevents accidental data loss.",
        });
    }

    const result = storage.clearLogs({
        projectMarker: input.projectMarker,
        sessionId: input.sessionId,
    });

    return Promise.resolve({
        success: true,
        cleared: result.cleared,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsClearTool = {
    name: "logs_clear",
    description:
        "Clear logs from the server. " +
        "Requires confirm: true to proceed - this prevents accidental data loss. " +
        "Can optionally filter by projectMarker to clear only one project, " +
        "or by sessionId to clear a specific session. " +
        "Without filters, clears ALL logs.",
    inputSchema: logsClearInputSchema,
};
