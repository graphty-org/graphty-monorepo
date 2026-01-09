/**
 * logs_get_file_path MCP tool implementation.
 *
 * Returns the path to the JSONL log file for a project.
 * @module mcp/tools/logs-get-file-path
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as z from "zod/v3";

import type { LogStorage } from "../../server/log-storage.js";
import { resolveProjectMarker } from "../../server/marker-utils.js";

/**
 * Input schema for the logs_get_file_path tool.
 */
export const logsGetFilePathInputSchema = z.object({
    /** Project identifier to get the log file for. Derived from workingDirectory if not provided. */
    projectMarker: z.string().optional(),
    /** Directory path to derive project marker from. Ignored if projectMarker is set. */
    workingDirectory: z.string().optional(),
});

/**
 * Input type for the logs_get_file_path handler.
 */
export type LogsGetFilePathInput = z.infer<typeof logsGetFilePathInputSchema>;

/**
 * Output type for the logs_get_file_path handler.
 */
export interface LogsGetFilePathOutput {
    /** Full path to the JSONL log file */
    path: string;
    /** Whether the file exists */
    exists: boolean;
    /** File size in bytes (0 if file doesn't exist) */
    size: number;
}

/**
 * Get the default JSONL file path for a project marker.
 * This is used when no JsonlWriter is configured.
 * @param projectMarker - The project marker
 * @returns Full path to the JSONL file
 */
export function getLogFilePath(projectMarker: string): string {
    return path.join(os.tmpdir(), "remote-logger", projectMarker, "logs.jsonl");
}

/**
 * Handler for the logs_get_file_path tool.
 *
 * Returns the path to the JSONL log file for the specified project.
 * The file may not exist if no logs have been written yet.
 * @param storage - The log storage instance
 * @param input - Input parameters
 * @returns File path, existence status, and size
 */
export function logsGetFilePathHandler(
    storage: LogStorage,
    input: Partial<LogsGetFilePathInput>,
): Promise<LogsGetFilePathOutput> {
    // Resolve project marker
    const projectMarker = resolveProjectMarker({
        projectMarker: input.projectMarker,
        workingDirectory: input.workingDirectory,
    });

    // Get file path from JsonlWriter if available, otherwise use default
    const jsonlWriter = storage.getJsonlWriter();
    const filePath = jsonlWriter
        ? jsonlWriter.getFilePath(projectMarker)
        : getLogFilePath(projectMarker);

    // Check if file exists and get stats
    // Prefer JsonlWriter stats if available for consistency
    if (jsonlWriter) {
        const stats = jsonlWriter.getFileStats(projectMarker);
        if (stats) {
            return Promise.resolve({
                path: filePath,
                exists: stats.exists,
                size: stats.size,
            });
        }
    }

    // Fall back to direct file system check
    let exists = false;
    let size = 0;

    try {
        const stats = fs.statSync(filePath);
        exists = true;
        ({ size } = stats);
    } catch {
        // File doesn't exist, use defaults
    }

    return Promise.resolve({
        path: filePath,
        exists,
        size,
    });
}

/**
 * Tool definition for MCP registration.
 */
export const logsGetFilePathTool = {
    name: "logs_get_file_path",
    description:
        "Get the file path to the JSONL log file for a project. " +
        "Use this to access logs via file-based tools like Grep or Read. " +
        "Each project has its own log file. " +
        "The file may not exist if no logs have been written yet for that project.",
    inputSchema: logsGetFilePathInputSchema,
};
