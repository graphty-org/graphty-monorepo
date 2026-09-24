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
 * Then point the element at it. The element does not read the page's query string, so the
 * server is named in the logging configuration -- by a live sink, or by the reference a stored
 * configuration can record:
 * ```ts
 * import { GraphtyLogger } from "@graphty/graphty-element/logging";
 *
 * await GraphtyLogger.configure({
 *     enabled: true,
 *     sinks: [{ use: "remote", options: { serverUrl: "https://localhost:9080" } }],
 * });
 * ```
 */

import { RemoteLogClient, type ThrottlePattern } from "@graphty/remote-logger";

import { formatLogRecord } from "../format.js";
import { LOG_LEVEL_TO_NAME, type LogRecord, type Sink } from "../types.js";

/**
 * Options for the remote sink.
 */
export interface RemoteSinkOptions {
    /** URL of the remote log server (e.g., `https://localhost:9080`) */
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
 * Render one record as the single line a log server stores.
 *
 * The line itself is the element's own rendering, so a record read back off a server is the
 * record a developer would have seen in their console. Two parts are settled here rather than
 * taken from the logging configuration: the time is left off, because the server records its own
 * and the client sends one beside the line; and the category is always named, because a server
 * collects from several pages at once and "who said it" is the first thing anybody filters on.
 *
 * What is appended is what a console shows beside the line and a single string cannot: the
 * structured facts, and the failure's stack.
 * @param record - The log record to format
 * @returns A formatted message string
 */
function formatRecord(record: LogRecord): string {
    const parts: string[] = [formatLogRecord(record, { timestamp: false, module: true })];

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

        /*
         * The client holds a batch timer, and before `dispose` existed nothing ever stopped it:
         * removing this destination left it posting to a server the page had stopped listening
         * to. `close` sends what is buffered first, so records already accepted are not lost.
         */
        async dispose(): Promise<void> {
            await client.close();
        },
    };
}
