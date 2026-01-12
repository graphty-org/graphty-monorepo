/**
 * Type definitions for the remote logging client.
 * @module client/types
 */

/**
 * A single log entry to be sent to the remote server.
 */
export interface LogEntry {
    /** ISO 8601 timestamp when the log was created */
    time: string;
    /** Log level (e.g., "INFO", "DEBUG", "WARN", "ERROR") */
    level: string;
    /** The log message */
    message: string;
    /** Optional additional data to include with the log */
    data?: Record<string, unknown>;
}

/**
 * Configuration for throttling specific message patterns.
 */
export interface ThrottlePattern {
    /** Regular expression pattern to match log messages */
    pattern: RegExp;
    /** Minimum interval in milliseconds between matching messages */
    intervalMs: number;
}

/**
 * Configuration options for the RemoteLogClient.
 */
export interface RemoteLogClientOptions {
    /** URL of the remote log server (e.g., "http://localhost:9080") */
    serverUrl: string;
    /** Prefix for the generated session ID (default: "session") */
    sessionPrefix?: string;
    /** Interval in milliseconds between batch sends (default: 1000) */
    batchIntervalMs?: number;
    /** Maximum number of retry attempts for failed sends (default: 3) */
    maxRetries?: number;
    /** Base delay in milliseconds between retries (uses exponential backoff) (default: 1000) */
    retryDelayMs?: number;
    /**
     * Patterns to throttle to prevent log flooding.
     * Messages matching a pattern will only be sent once per the configured interval.
     */
    throttlePatterns?: ThrottlePattern[];
    /**
     * Project marker to identify logs from this project.
     * If not provided, the client will attempt to read from the
     * __REMOTE_LOG_PROJECT_MARKER__ global variable (injected by Vite plugin).
     */
    projectMarker?: string;
    /**
     * Full path to the worktree or project directory.
     * Used for debugging and log organization.
     * If not provided, the client will attempt to read from the
     * __REMOTE_LOG_WORKTREE_PATH__ global variable (injected by Vite plugin).
     */
    worktreePath?: string;
    /**
     * Request timeout in milliseconds.
     * Requests that take longer than this will be aborted and retried.
     * @default 5000
     */
    timeoutMs?: number;
}
