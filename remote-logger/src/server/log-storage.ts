/**
 * Shared log storage with session metadata support.
 *
 * This module provides a centralized storage for logs that can be shared
 * between HTTP and MCP interfaces. It supports project markers for
 * filtering logs by git worktree or project.
 * @module server/log-storage
 */

import type { JsonlWriter } from "./jsonl-writer.js";
import { extractMarkerFromSessionId } from "./marker-utils.js";

/**
 * A single log entry.
 */
export interface LogEntry {
    /** ISO 8601 timestamp when the log was created */
    time: string;
    /** Log level (e.g., "INFO", "DEBUG", "WARN", "ERROR") */
    level: string;
    /** The log message */
    message: string;
    /** Optional additional data */
    data?: Record<string, unknown>;
}

/**
 * A log entry with session information attached.
 */
export interface LogEntryWithSession extends LogEntry {
    /** The session ID this log belongs to */
    sessionId: string;
}

/**
 * Metadata about a logging session.
 */
export interface SessionMetadata {
    /** Unique identifier for the session */
    sessionId: string;
    /** Project marker for filtering (derived or explicit) */
    projectMarker: string;
    /** Full worktree path if available */
    worktreePath?: string;
    /** Browser page URL if available */
    pageUrl?: string;
    /** Timestamp of first log in session */
    firstLogTime: string;
    /** Timestamp of most recent log in session */
    lastLogTime: string;
    /** Total number of logs in session */
    logCount: number;
    /** Number of ERROR level logs */
    errorCount: number;
}

/**
 * Internal session data structure.
 */
interface SessionData {
    metadata: SessionMetadata;
    logs: LogEntry[];
}

/**
 * Options when adding logs to storage.
 */
export interface AddLogsOptions {
    /** Explicit project marker (overrides auto-detection) */
    projectMarker?: string;
    /** Full worktree path */
    worktreePath?: string;
    /** Browser page URL */
    pageUrl?: string;
}

/**
 * Filter options for querying logs.
 */
export interface LogFilter {
    /** Filter by project marker */
    projectMarker?: string;
    /** Filter by session ID */
    sessionId?: string;
    /** Filter by log level */
    level?: string;
    /** Only return logs after this timestamp */
    since?: string;
}

/**
 * Filter options for querying sessions.
 */
export interface SessionFilter {
    /** Filter by project marker */
    projectMarker?: string;
    /** Only return sessions with errors */
    hasErrors?: boolean;
}

/**
 * Filter options for clearing logs.
 */
export interface ClearFilter {
    /** Clear only logs for this project marker */
    projectMarker?: string;
    /** Clear only logs for this session ID */
    sessionId?: string;
}

/**
 * Search options for finding logs by content.
 */
export interface SearchOptions {
    /** Search query (substring or regex) */
    query: string;
    /** Treat query as regex (default: false) */
    regex?: boolean;
    /** Filter by project marker */
    projectMarker?: string;
    /** Filter by log level */
    level?: string;
    /** Maximum results to return (default: 100) */
    limit?: number;
}

/**
 * Server mode indicating which interfaces are enabled.
 */
export type ServerMode = "mcp-only" | "http-only" | "dual";

/**
 * HTTP server configuration.
 */
export interface ServerConfig {
    /** HTTP server port */
    httpPort: number;
    /** HTTP server host */
    httpHost: string;
    /** Protocol (http or https) */
    protocol: "http" | "https";
    /** Full URL for browser clients to send logs to */
    httpEndpoint: string;
    /** Server mode (mcp-only, http-only, or dual) */
    mode: ServerMode;
}

/**
 * Health status of the log storage.
 */
export interface HealthStatus {
    /** Overall status */
    status: "ok" | "error";
    /** Number of active sessions */
    sessionCount: number;
    /** Total number of logs stored */
    totalLogs: number;
    /** Total number of error logs */
    totalErrors: number;
    /** Time since storage was created (milliseconds) */
    uptimeMs: number;
}

/**
 * Full server status including health and configuration.
 */
export interface ServerStatus extends HealthStatus {
    /** HTTP server configuration (undefined if HTTP server not configured) */
    server?: ServerConfig;
    /** Number of days logs are retained before automatic cleanup */
    retentionDays: number;
}

/**
 * Default retention period in days.
 */
const DEFAULT_RETENTION_DAYS = 7;

/**
 * Default cleanup interval in milliseconds (1 hour).
 */
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Options for LogStorage constructor.
 */
export interface LogStorageOptions {
    /** Optional JSONL writer for streaming logs to disk */
    jsonlWriter?: JsonlWriter;
    /** Number of days to retain logs (default: 7, can be set via REMOTE_LOG_RETENTION_DAYS env var) */
    retentionDays?: number;
    /** Interval between cleanup checks in milliseconds (default: 1 hour) */
    cleanupIntervalMs?: number;
}

/**
 * Shared log storage with session metadata support.
 *
 * Provides methods for storing, querying, and managing logs across
 * multiple sessions with support for project marker filtering.
 */
export class LogStorage {
    private sessions = new Map<string, SessionData>();
    private startTime = Date.now();
    private jsonlWriter?: JsonlWriter;
    private retentionDays: number;
    private cleanupTimer?: ReturnType<typeof setInterval>;
    private serverConfig?: ServerConfig;

    /**
     * Create a new LogStorage instance.
     * @param options - Optional configuration including JSONL writer
     */
    constructor(options: LogStorageOptions = {}) {
        this.jsonlWriter = options.jsonlWriter;

        // Determine retention days from options, env var, or default
        const envRetention = process.env.REMOTE_LOG_RETENTION_DAYS;
        this.retentionDays = options.retentionDays
            ?? (envRetention ? parseInt(envRetention, 10) : undefined)
            ?? DEFAULT_RETENTION_DAYS;

        // Start periodic cleanup timer
        const cleanupInterval = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
        if (cleanupInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanupExpiredLogs();
            }, cleanupInterval);
            // Don't prevent process exit
            this.cleanupTimer.unref?.();
        }
    }

    /**
     * Get the JSONL writer if configured.
     * @returns The JSONL writer or undefined
     */
    getJsonlWriter(): JsonlWriter | undefined {
        return this.jsonlWriter;
    }

    /**
     * Add logs to storage for a session.
     * @param sessionId - Unique identifier for the session
     * @param logs - Array of log entries to add
     * @param options - Additional options (projectMarker, worktreePath, pageUrl)
     */
    addLogs(sessionId: string, logs: LogEntry[], options: AddLogsOptions = {}): void {
        let sessionData = this.sessions.get(sessionId);

        // Determine project marker for new sessions
        const projectMarker = options.projectMarker || extractMarkerFromSessionId(sessionId);

        if (!sessionData) {
            // Create new session
            sessionData = {
                metadata: {
                    sessionId,
                    projectMarker,
                    worktreePath: options.worktreePath,
                    pageUrl: options.pageUrl,
                    firstLogTime: logs[0]?.time || new Date().toISOString(),
                    lastLogTime: logs[0]?.time || new Date().toISOString(),
                    logCount: 0,
                    errorCount: 0,
                },
                logs: [],
            };
            this.sessions.set(sessionId, sessionData);
        }

        // Add logs and update metadata
        for (const log of logs) {
            sessionData.logs.push(log);
            sessionData.metadata.logCount++;
            sessionData.metadata.lastLogTime = log.time;

            if (log.level.toUpperCase() === "ERROR") {
                sessionData.metadata.errorCount++;
            }

            // Write to JSONL file if writer is configured
            if (this.jsonlWriter) {
                // Use the session's project marker
                const marker = sessionData.metadata.projectMarker;
                void this.jsonlWriter.write(marker, {
                    time: log.time,
                    level: log.level,
                    message: log.message,
                    sessionId,
                    data: log.data,
                });
            }
        }

        // Update optional metadata if provided
        if (options.worktreePath && !sessionData.metadata.worktreePath) {
            sessionData.metadata.worktreePath = options.worktreePath;
        }
        if (options.pageUrl && !sessionData.metadata.pageUrl) {
            sessionData.metadata.pageUrl = options.pageUrl;
        }
    }

    /**
     * Get logs with optional filtering.
     * @param filter - Filter options
     * @returns Array of log entries with session IDs
     */
    getLogs(filter: LogFilter = {}): LogEntryWithSession[] {
        const results: LogEntryWithSession[] = [];

        for (const [sessionId, sessionData] of this.sessions) {
            // Filter by project marker
            if (filter.projectMarker && sessionData.metadata.projectMarker !== filter.projectMarker) {
                continue;
            }

            // Filter by session ID
            if (filter.sessionId && sessionId !== filter.sessionId) {
                continue;
            }

            for (const log of sessionData.logs) {
                // Filter by level
                if (filter.level && log.level.toUpperCase() !== filter.level.toUpperCase()) {
                    continue;
                }

                // Filter by since
                if (filter.since && new Date(log.time) <= new Date(filter.since)) {
                    continue;
                }

                results.push({ ...log, sessionId });
            }
        }

        return results;
    }

    /**
     * Get the most recent logs across all sessions.
     * @param count - Maximum number of logs to return
     * @param filter - Optional filter to apply before limiting
     * @returns Array of recent log entries (oldest first)
     */
    getRecentLogs(count: number, filter: LogFilter = {}): LogEntryWithSession[] {
        const allLogs = this.getLogs(filter);

        // Sort by time descending (newest first)
        allLogs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Take the most recent 'count' logs, then reverse to show oldest first
        return allLogs.slice(0, count).reverse();
    }

    /**
     * Get only ERROR level logs.
     * @param filter - Optional filter options
     * @returns Array of error log entries
     */
    getErrors(filter: Omit<LogFilter, "level"> = {}): LogEntryWithSession[] {
        const logs = this.getLogs({ ...filter, level: "ERROR" });
        // Sort chronologically
        return logs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }

    /**
     * Get all sessions with their metadata.
     * @param filter - Optional filter options
     * @returns Array of session metadata
     */
    getSessions(filter: SessionFilter = {}): SessionMetadata[] {
        const results: SessionMetadata[] = [];

        for (const sessionData of this.sessions.values()) {
            // Filter by project marker
            if (filter.projectMarker && sessionData.metadata.projectMarker !== filter.projectMarker) {
                continue;
            }

            // Filter by hasErrors
            if (filter.hasErrors && sessionData.metadata.errorCount === 0) {
                continue;
            }

            results.push({ ...sessionData.metadata });
        }

        return results;
    }

    /**
     * Clear logs with optional filtering.
     * @param filter - Optional filter to limit what is cleared
     * @returns Object with count of cleared sessions
     */
    clearLogs(filter: ClearFilter = {}): { cleared: number } {
        let cleared = 0;

        if (!filter.projectMarker && !filter.sessionId) {
            // Clear all
            cleared = this.sessions.size;
            this.sessions.clear();
        } else {
            // Clear selectively
            const toDelete: string[] = [];

            for (const [sessionId, sessionData] of this.sessions) {
                if (filter.sessionId && sessionId === filter.sessionId) {
                    toDelete.push(sessionId);
                } else if (filter.projectMarker && sessionData.metadata.projectMarker === filter.projectMarker) {
                    toDelete.push(sessionId);
                }
            }

            for (const sessionId of toDelete) {
                this.sessions.delete(sessionId);
                cleared++;
            }
        }

        return { cleared };
    }

    /**
     * Clear all logs (convenience method).
     */
    clear(): void {
        this.sessions.clear();
    }

    /**
     * Set the HTTP server configuration.
     * Call this after the HTTP server starts to make endpoint info available.
     * @param config - Server configuration
     */
    setServerConfig(config: ServerConfig): void {
        this.serverConfig = config;
    }

    /**
     * Get the HTTP server configuration.
     * @returns Server configuration or undefined if not set
     */
    getServerConfig(): ServerConfig | undefined {
        return this.serverConfig;
    }

    /**
     * Get health status of the storage.
     * @returns Health status object
     */
    getHealth(): HealthStatus {
        let totalLogs = 0;
        let totalErrors = 0;

        for (const sessionData of this.sessions.values()) {
            totalLogs += sessionData.metadata.logCount;
            totalErrors += sessionData.metadata.errorCount;
        }

        return {
            status: "ok",
            sessionCount: this.sessions.size,
            totalLogs,
            totalErrors,
            uptimeMs: Date.now() - this.startTime,
        };
    }

    /**
     * Get full server status including health and configuration.
     * @returns Server status object
     */
    getStatus(): ServerStatus {
        const health = this.getHealth();
        return {
            ...health,
            server: this.serverConfig,
            retentionDays: this.retentionDays,
        };
    }

    /**
     * Get logs for a specific session.
     * @param sessionId - The session ID to get logs for
     * @returns Array of log entries for the session
     */
    getLogsForSession(sessionId: string): LogEntry[] {
        const sessionData = this.sessions.get(sessionId);
        return sessionData ? [...sessionData.logs] : [];
    }

    /**
     * Get all logs grouped by session ID.
     * @param filter - Optional filter options
     * @param filter.projectMarker - Filter by project marker
     * @returns Object mapping session IDs to log arrays
     */
    getAllLogsBySession(filter: { projectMarker?: string } = {}): Record<string, LogEntry[]> {
        const result: Record<string, LogEntry[]> = {};

        for (const [sessionId, sessionData] of this.sessions) {
            if (filter.projectMarker && sessionData.metadata.projectMarker !== filter.projectMarker) {
                continue;
            }
            result[sessionId] = [...sessionData.logs];
        }

        return result;
    }

    /**
     * Search logs by content.
     * @param options - Search options
     * @returns Array of matching log entries
     */
    search(options: SearchOptions): LogEntryWithSession[] {
        const { query, regex = false, projectMarker, level, limit = 100 } = options;

        // Build the search pattern
        let pattern: RegExp;
        try {
            pattern = regex ? new RegExp(query, "i") : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        } catch {
            // Invalid regex, return empty results
            return [];
        }

        const results: LogEntryWithSession[] = [];

        for (const [sessionId, sessionData] of this.sessions) {
            // Filter by project marker
            if (projectMarker && sessionData.metadata.projectMarker !== projectMarker) {
                continue;
            }

            for (const log of sessionData.logs) {
                // Filter by level
                if (level && log.level.toUpperCase() !== level.toUpperCase()) {
                    continue;
                }

                // Test message against pattern
                if (pattern.test(log.message)) {
                    results.push({ ...log, sessionId });

                    if (results.length >= limit) {
                        return results;
                    }
                }
            }
        }

        return results;
    }

    /**
     * Check if a session exists.
     * @param sessionId - The session ID to check
     * @returns True if the session exists
     */
    hasSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    /**
     * Get metadata for a specific session.
     * @param sessionId - The session ID
     * @returns Session metadata or undefined if not found
     */
    getSessionMetadata(sessionId: string): SessionMetadata | undefined {
        const sessionData = this.sessions.get(sessionId);
        return sessionData ? { ...sessionData.metadata } : undefined;
    }

    /**
     * Get the configured retention period in days.
     * @returns Number of days logs are retained
     */
    getRetentionDays(): number {
        return this.retentionDays;
    }

    /**
     * Stop the periodic cleanup timer.
     * Call this when shutting down to prevent memory leaks.
     */
    stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }

    /**
     * Clean up logs older than the retention period.
     * This removes individual logs from sessions, removes sessions
     * that have no remaining logs, and cleans up old JSONL files.
     * @returns Number of sessions that were completely removed
     */
    cleanupExpiredLogs(): number {
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - this.retentionDays);
        const cutoffMs = cutoffTime.getTime();

        const sessionsToRemove: string[] = [];

        for (const [sessionId, sessionData] of this.sessions) {
            // Filter out expired logs
            const remainingLogs = sessionData.logs.filter(
                (log) => new Date(log.time).getTime() > cutoffMs,
            );

            if (remainingLogs.length === 0) {
                // Session has no remaining logs, mark for removal
                sessionsToRemove.push(sessionId);
            } else if (remainingLogs.length !== sessionData.logs.length) {
                // Some logs were removed, update the session
                sessionData.logs = remainingLogs;

                // Recalculate metadata
                let errorCount = 0;
                for (const log of remainingLogs) {
                    if (log.level.toUpperCase() === "ERROR") {
                        errorCount++;
                    }
                }

                sessionData.metadata.logCount = remainingLogs.length;
                sessionData.metadata.errorCount = errorCount;
                sessionData.metadata.firstLogTime = remainingLogs[0].time;
                sessionData.metadata.lastLogTime = remainingLogs[remainingLogs.length - 1].time;
            }
        }

        // Remove empty sessions
        for (const sessionId of sessionsToRemove) {
            this.sessions.delete(sessionId);
        }

        // Clean up old JSONL files
        if (this.jsonlWriter) {
            this.jsonlWriter.cleanupOldFiles(this.retentionDays);
        }

        return sessionsToRemove.length;
    }
}
