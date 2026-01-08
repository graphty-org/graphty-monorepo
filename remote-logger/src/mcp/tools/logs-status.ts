/**
 * logs_status MCP tool implementation.
 *
 * Returns server status including health metrics and HTTP endpoint configuration.
 * @module mcp/tools/logs-status
 */

import * as z from "zod/v3";

import type { LogStorage, ServerStatus } from "../../server/log-storage.js";

/**
 * Input schema for the logs_status tool.
 */
export const logsStatusInputSchema = z.object({});

/**
 * Input type for the logs_status handler.
 */
export type LogsStatusInput = z.infer<typeof logsStatusInputSchema>;

/**
 * Output type for the logs_status handler.
 */
export interface LogsStatusOutput extends ServerStatus {
    /** Memory usage information */
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
}

/**
 * Handler for the logs_status tool.
 *
 * Returns the full status of the log server, including health metrics,
 * HTTP endpoint configuration, and memory usage.
 * @param storage - The log storage instance
 * @returns Server status object
 */
export function logsStatusHandler(storage: LogStorage): Promise<LogsStatusOutput> {
    const status = storage.getStatus();
    const memUsage = process.memoryUsage();

    return Promise.resolve({
        ...status,
        memoryUsage: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
        },
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsStatusTool = {
    name: "logs_status",
    description:
        "Get the status of the remote log server. " +
        "Returns health metrics (uptime, session count, log count, memory usage), " +
        "HTTP endpoint configuration (port, host, URL for browser clients), " +
        "and retention settings (how long logs are kept before automatic cleanup). " +
        "Use this to verify the server is running, find the endpoint URL for configuring browser clients, " +
        "or check server configuration.",
    inputSchema: logsStatusInputSchema,
};
