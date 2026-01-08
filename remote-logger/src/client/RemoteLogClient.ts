/**
 * Browser client for sending log messages to a remote server.
 * Provides batching and automatic retry with exponential backoff.
 * @module client/RemoteLogClient
 */

import type { LogEntry, RemoteLogClientOptions, ThrottlePattern } from "./types.js";

/**
 * Global variables that may be injected by the Vite plugin.
 * These provide automatic project marker detection.
 */
declare const __REMOTE_LOG_PROJECT_MARKER__: string | undefined;
declare const __REMOTE_LOG_WORKTREE_PATH__: string | undefined;

/**
 * Safely read a global variable that may or may not be defined.
 * @param name - Name of the global variable
 * @returns The value of the global variable, or undefined if not defined
 */
function getGlobalValue(name: "__REMOTE_LOG_PROJECT_MARKER__" | "__REMOTE_LOG_WORKTREE_PATH__"): string | undefined {
    try {
        if (name === "__REMOTE_LOG_PROJECT_MARKER__") {
            return typeof __REMOTE_LOG_PROJECT_MARKER__ !== "undefined" ? __REMOTE_LOG_PROJECT_MARKER__ : undefined;
        }
        if (name === "__REMOTE_LOG_WORKTREE_PATH__") {
            return typeof __REMOTE_LOG_WORKTREE_PATH__ !== "undefined" ? __REMOTE_LOG_WORKTREE_PATH__ : undefined;
        }
    } catch {
        // ReferenceError if the global is not defined at all
        return undefined;
    }
    return undefined;
}

/** Default configuration values */
const DEFAULT_BATCH_INTERVAL_MS = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_SESSION_PREFIX = "session";

/**
 * Generates a unique session ID with the given prefix.
 * Format: {prefix}-{timestamp}-{random}
 * @param prefix - The prefix to use for the session ID
 * @returns A unique session ID string
 */
function generateSessionId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Client for sending log messages to a remote logging server.
 *
 * Features:
 * - Batches multiple log entries before sending
 * - Automatic retry with exponential backoff on network failures
 * - Unique session ID for correlating logs
 * @example
 * ```typescript
 * const client = new RemoteLogClient({
 *     serverUrl: "http://localhost:9080",
 *     sessionPrefix: "myapp",
 * });
 *
 * client.log("INFO", "User logged in", { userId: 123 });
 * client.log("DEBUG", "Loading data...");
 *
 * // Flush immediately when needed
 * await client.flush();
 *
 * // Clean up when done
 * await client.close();
 * ```
 */
export class RemoteLogClient {
    /** Unique identifier for this logging session */
    readonly sessionId: string;

    private readonly serverUrl: string;
    private readonly batchIntervalMs: number;
    private readonly maxRetries: number;
    private readonly retryDelayMs: number;
    private readonly throttlePatterns: ThrottlePattern[];
    private readonly projectMarker: string | undefined;
    private readonly worktreePath: string | undefined;

    private pendingLogs: LogEntry[] = [];
    private batchTimer: ReturnType<typeof setTimeout> | null = null;
    private isClosed = false;
    private flushPromise: Promise<void> | null = null;

    /** Tracks when each throttle pattern was last allowed through */
    private throttleLastTimes = new Map<string, number>();

    /**
     * Creates a new RemoteLogClient.
     * @param options - Configuration options
     */
    constructor(options: RemoteLogClientOptions) {
        this.serverUrl = options.serverUrl;
        this.sessionId = generateSessionId(options.sessionPrefix ?? DEFAULT_SESSION_PREFIX);
        this.batchIntervalMs = options.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
        this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
        this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
        this.throttlePatterns = options.throttlePatterns ?? [];

        // Priority: explicit option > global variable
        this.projectMarker = options.projectMarker ?? getGlobalValue("__REMOTE_LOG_PROJECT_MARKER__");
        this.worktreePath = options.worktreePath ?? getGlobalValue("__REMOTE_LOG_WORKTREE_PATH__");
    }

    /**
     * Checks if a message should be throttled based on configured patterns.
     * Updates the last time tracking if the message is allowed through.
     * @param message - The message to check
     * @returns true if the message should be dropped (throttled)
     */
    private shouldThrottle(message: string): boolean {
        const now = Date.now();

        for (const { pattern, intervalMs } of this.throttlePatterns) {
            if (pattern.test(message)) {
                const key = pattern.source;
                const lastTime = this.throttleLastTimes.get(key) ?? 0;

                if (now - lastTime < intervalMs) {
                    // Within throttle window, drop this message
                    return true;
                }

                // Outside throttle window, update timestamp and allow through
                this.throttleLastTimes.set(key, now);
                return false;
            }
        }

        // No matching pattern, allow through
        return false;
    }

    /**
     * Logs a message at the specified level.
     * @param level - Log level (e.g., "INFO", "DEBUG", "WARN", "ERROR")
     * @param message - The log message
     * @param data - Optional additional data to include
     */
    log(level: string, message: string, data?: Record<string, unknown>): void {
        if (this.isClosed) {
            return;
        }

        // Check throttling before adding to buffer
        if (this.shouldThrottle(message)) {
            return;
        }

        const entry: LogEntry = {
            time: new Date().toISOString(),
            level,
            message,
            ...(data !== undefined && { data }),
        };

        this.pendingLogs.push(entry);
        this.scheduleBatchSend();
    }

    /**
     * Schedules a batch send after the configured interval.
     * If a timer is already scheduled, does nothing.
     */
    private scheduleBatchSend(): void {
        if (this.batchTimer !== null || this.isClosed) {
            return;
        }

        this.batchTimer = setTimeout(() => {
            this.batchTimer = null;
            void this.sendBatch();
        }, this.batchIntervalMs);
    }

    /**
     * Sends the current batch of logs to the server.
     * Uses retry logic with exponential backoff on failure.
     */
    private async sendBatch(): Promise<void> {
        if (this.pendingLogs.length === 0) {
            return;
        }

        // Take the current logs and clear the pending array
        const logsToSend = this.pendingLogs;
        this.pendingLogs = [];

        await this.sendWithRetry(logsToSend);
    }

    /**
     * Sends logs with retry logic using exponential backoff.
     * @param logs - The log entries to send
     */
    private async sendWithRetry(logs: LogEntry[]): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                await this.sendRequest(logs);
                return; // Success!
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.maxRetries) {
                    // Exponential backoff: delay * 2^attempt
                    const delay = this.retryDelayMs * Math.pow(2, attempt);
                    await this.sleep(delay);
                }
            }
        }

        // All retries exhausted - log the error but don't throw
        // In a browser context, we don't want to break the application
        console.error("[RemoteLogClient] Failed to send logs after retries:", lastError?.message);
    }

    /**
     * Makes the actual HTTP request to send logs.
     * @param logs - The log entries to send
     * @throws Error if the request fails
     */
    private async sendRequest(logs: LogEntry[]): Promise<void> {
        const requestBody: {
            sessionId: string;
            logs: LogEntry[];
            projectMarker?: string;
            worktreePath?: string;
        } = {
            sessionId: this.sessionId,
            logs,
        };

        // Only include these fields if they have values
        if (this.projectMarker !== undefined) {
            requestBody.projectMarker = this.projectMarker;
        }
        if (this.worktreePath !== undefined) {
            requestBody.worktreePath = this.worktreePath;
        }

        const response = await fetch(`${this.serverUrl}/log`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    /**
     * Helper to sleep for the specified duration.
     * @param ms - Milliseconds to sleep
     * @returns A promise that resolves after the specified time
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Immediately flushes all pending logs to the server.
     * Useful before page unload or when immediate delivery is needed.
     */
    async flush(): Promise<void> {
        // Cancel any scheduled batch
        if (this.batchTimer !== null) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // Wait for any in-progress flush
        if (this.flushPromise !== null) {
            await this.flushPromise;
        }

        // Send any remaining logs
        if (this.pendingLogs.length > 0) {
            this.flushPromise = this.sendBatch();
            await this.flushPromise;
            this.flushPromise = null;
        }
    }

    /**
     * Closes the client, flushing any pending logs and stopping the batch timer.
     * After calling close(), no more logs will be accepted.
     */
    async close(): Promise<void> {
        if (this.isClosed) {
            return;
        }

        this.isClosed = true;

        // Flush remaining logs
        await this.flush();
    }
}

/**
 * Factory function to create a RemoteLogClient.
 * @param options - Configuration options
 * @returns A new RemoteLogClient instance
 * @example
 * ```typescript
 * const client = createRemoteLogClient({
 *     serverUrl: "http://localhost:9080",
 * });
 * ```
 */
export function createRemoteLogClient(options: RemoteLogClientOptions): RemoteLogClient {
    return new RemoteLogClient(options);
}
