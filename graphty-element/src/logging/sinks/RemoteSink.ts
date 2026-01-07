/**
 * Remote logging sink for sending logs to a remote server.
 * This wraps RemoteLogClient from @graphty/remote-logger to integrate
 * with graphty-element's logging system.
 *
 * To start a log server, use the @graphty/remote-logger CLI:
 * ```bash
 * npx @graphty/remote-logger --port 9080
 * ```
 *
 * Then enable remote logging in graphty-element via URL parameter:
 * ```
 * ?graphty-element-logging=true&graphty-element-remote-log=https://localhost:9080
 * ```
 */

import { RemoteLogClient, type ThrottlePattern } from "@graphty/remote-logger";

import { LOG_LEVEL_TO_NAME, type LogRecord, type Sink } from "../types.js";

/**
 * Options for the remote sink.
 */
export interface RemoteSinkOptions {
    /** URL of the remote log server (e.g., https://localhost:9080) */
    serverUrl: string;
    /** Prefix for session ID (default: "graphty") */
    sessionPrefix?: string;
    /** Interval in ms to batch logs before sending (default: 100) */
    batchIntervalMs?: number;
    /** Maximum number of retries on failure (default: 3) */
    maxRetries?: number;
    /** Delay between retries in ms (default: 1000) */
    retryDelayMs?: number;
    /** Patterns to throttle (prevent log flooding) */
    throttlePatterns?: RegExp[];
    /** Throttle window in ms (default: 5000) */
    throttleMs?: number;
}

/**
 * Format a LogRecord into a message string for the remote server.
 * @param record - The log record to format
 * @returns A formatted message string
 */
function formatRecord(record: LogRecord): string {
    const parts: string[] = [];

    // Add category
    parts.push(`[${record.category.join(".")}]`);

    // Add message
    parts.push(record.message);

    // Add structured data if present
    if (record.data && Object.keys(record.data).length > 0) {
        try {
            parts.push(JSON.stringify(record.data));
        } catch {
            parts.push("[non-serializable data]");
        }
    }

    // Add error stack if present
    if (record.error) {
        parts.push(`\nError: ${record.error.message}`);
        if (record.error.stack) {
            parts.push(`\n${record.error.stack}`);
        }
    }

    return parts.join(" ");
}

/**
 * Create a remote sink for sending logs to a log server.
 * @param options - Sink configuration options
 * @returns A Sink that sends logs to the remote server
 */
export function createRemoteSink(options: RemoteSinkOptions): Sink {
    const serverUrl = options.serverUrl.replace(/\/$/, ""); // Remove trailing slash
    const sessionPrefix = options.sessionPrefix ?? "graphty";
    const batchIntervalMs = options.batchIntervalMs ?? 100;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelayMs = options.retryDelayMs ?? 1000;
    const throttleMs = options.throttleMs ?? 5000;

    // Convert graphty-element's throttle format to remote-logger's format
    // graphty-element uses RegExp[] with a shared throttleMs
    // remote-logger uses ThrottlePattern[] where each pattern has its own intervalMs
    const throttlePatterns: ThrottlePattern[] | undefined = options.throttlePatterns?.map((pattern) => ({
        pattern,
        intervalMs: throttleMs,
    }));

    // Create the underlying RemoteLogClient
    const client = new RemoteLogClient({
        serverUrl,
        sessionPrefix,
        batchIntervalMs,
        maxRetries,
        retryDelayMs,
        throttlePatterns,
    });

    return {
        name: "remote",

        write(record: LogRecord): void {
            const message = formatRecord(record);
            const level = LOG_LEVEL_TO_NAME[record.level];
            client.log(level, message, record.data);
        },

        async flush(): Promise<void> {
            await client.flush();
        },
    };
}
