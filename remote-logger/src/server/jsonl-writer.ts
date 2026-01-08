/**
 * JSONL file writer for streaming logs to disk.
 *
 * Organizes logs by project marker in the temp directory:
 * {baseDir}/{marker}/logs.jsonl
 * @module server/jsonl-writer
 */

import * as fs from "fs";
import * as path from "path";

/**
 * A JSONL log entry.
 */
export interface JsonlEntry {
    /** ISO 8601 timestamp when the log was created */
    time: string;
    /** Log level (e.g., "INFO", "DEBUG", "WARN", "ERROR") */
    level: string;
    /** The log message */
    message: string;
    /** Session ID this log belongs to */
    sessionId: string;
    /** Optional additional data */
    data?: Record<string, unknown>;
}

/**
 * File statistics.
 */
export interface FileStats {
    /** Whether the file exists */
    exists: boolean;
    /** File size in bytes */
    size: number;
}

/**
 * Internal state for a marker's file handle.
 */
interface MarkerState {
    /** File descriptor */
    fd: number;
    /** Pending writes buffer */
    buffer: string[];
    /** Write lock to serialize writes */
    writeLock: Promise<void>;
}

/**
 * JSONL file writer that streams log entries to disk.
 *
 * Each project marker gets its own log file in the structure:
 * {baseDir}/{marker}/logs.jsonl
 */
export class JsonlWriter {
    private readonly baseDir: string;
    private readonly markerStates = new Map<string, MarkerState>();
    private closed = false;

    /**
     * Create a new JsonlWriter.
     * @param baseDir - Base directory for log files (e.g., os.tmpdir()/remote-logger)
     */
    constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    /**
     * Get the file path for a project marker.
     * @param projectMarker - The project marker
     * @returns Full path to the JSONL file
     */
    getFilePath(projectMarker: string): string {
        return path.join(this.baseDir, projectMarker, "logs.jsonl");
    }

    /**
     * Get file statistics for a project marker's log file.
     * @param projectMarker - The project marker
     * @returns File stats or null if file doesn't exist
     */
    getFileStats(projectMarker: string): FileStats | null {
        const filePath = this.getFilePath(projectMarker);

        try {
            const stats = fs.statSync(filePath);
            return {
                exists: true,
                size: stats.size,
            };
        } catch {
            return null;
        }
    }

    /**
     * Write a log entry to the appropriate file.
     * @param projectMarker - The project marker
     * @param entry - The log entry to write
     * @returns Promise that resolves when the write is queued
     */
    write(projectMarker: string, entry: JsonlEntry): Promise<void> {
        if (this.closed) {
            return Promise.resolve();
        }

        const state = this.ensureMarkerState(projectMarker);
        const line = `${JSON.stringify(entry)}\n`;

        // Add to buffer and trigger write
        state.buffer.push(line);

        // Chain the write to maintain order
        state.writeLock = state.writeLock.then(() => {
            this.flushBuffer(state);
        });

        return Promise.resolve();
    }

    /**
     * Flush all pending writes to disk.
     */
    async flush(): Promise<void> {
        const flushPromises: Promise<void>[] = [];

        for (const state of this.markerStates.values()) {
            // Wait for pending writes and flush buffer
            flushPromises.push(state.writeLock.then(() => {
                this.flushBuffer(state);
            }));
        }

        await Promise.all(flushPromises);

        // Sync all file descriptors
        for (const state of this.markerStates.values()) {
            try {
                fs.fsyncSync(state.fd);
            } catch {
                // Ignore sync errors
            }
        }
    }

    /**
     * Close all file handles.
     */
    async close(): Promise<void> {
        if (this.closed) {
            return;
        }

        this.closed = true;

        // Flush all pending writes
        await this.flush();

        // Close all file handles
        for (const state of this.markerStates.values()) {
            try {
                fs.closeSync(state.fd);
            } catch {
                // Ignore close errors
            }
        }

        this.markerStates.clear();
    }

    /**
     * Ensure the marker state exists, creating file if needed.
     * @param projectMarker - The project marker
     * @returns The marker state
     */
    private ensureMarkerState(projectMarker: string): MarkerState {
        let state = this.markerStates.get(projectMarker);

        if (!state) {
            const filePath = this.getFilePath(projectMarker);
            const dir = path.dirname(filePath);

            // Create directory if it doesn't exist
            fs.mkdirSync(dir, { recursive: true });

            // Open file for appending
            const fd = fs.openSync(filePath, "a");

            state = {
                fd,
                buffer: [],
                writeLock: Promise.resolve(),
            };

            this.markerStates.set(projectMarker, state);
        }

        return state;
    }

    /**
     * Flush the buffer for a marker state.
     * @param state - The marker state to flush
     */
    private flushBuffer(state: MarkerState): void {
        if (state.buffer.length === 0) {
            return;
        }

        // Take all buffered entries
        const toWrite = state.buffer.join("");
        state.buffer = [];

        // Write to file
        fs.writeSync(state.fd, toWrite);
    }

    /**
     * Clean up old project log files based on directory modification time.
     * Removes entire project directories that haven't been modified within the retention period.
     * @param retentionDays - Number of days to retain logs
     * @returns Number of project directories removed
     */
    cleanupOldFiles(retentionDays: number): number {
        // Check if base directory exists
        if (!fs.existsSync(this.baseDir)) {
            return 0;
        }

        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - retentionDays);
        const cutoffMs = cutoffTime.getTime();

        let removed = 0;

        try {
            const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }

                const dirPath = path.join(this.baseDir, entry.name);

                try {
                    const stats = fs.statSync(dirPath);

                    // Check if directory is older than retention period
                    if (stats.mtimeMs < cutoffMs) {
                        // Close file handle if we have one open for this marker
                        const state = this.markerStates.get(entry.name);
                        if (state) {
                            try {
                                fs.closeSync(state.fd);
                            } catch {
                                // Ignore close errors
                            }
                            this.markerStates.delete(entry.name);
                        }

                        // Remove the directory
                        fs.rmSync(dirPath, { recursive: true, force: true });
                        removed++;
                    }
                } catch {
                    // Ignore errors for individual directories
                }
            }
        } catch {
            // Ignore errors reading base directory
        }

        return removed;
    }
}
