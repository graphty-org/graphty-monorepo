/**
 * Log levels following standard syslog-inspired hierarchy.
 * Lower values are more severe.
 */
export enum LogLevel {
    SILENT = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5,
}

/**
 * One thing that happened, as every destination receives it.
 *
 * The same object is handed to every destination in turn, so it is frozen before the first one
 * sees it, and so is `data`. A destination that needs to change a record copies it; one that
 * changed it in place would change what every destination after it sees, and the destination it
 * broke would be somebody else's.
 */
export interface LogRecord {
    /** When the entry was made. */
    readonly timestamp: Date;
    /** How severe it is. TRACE arrives as TRACE, not collapsed onto DEBUG. */
    readonly level: LogLevel;
    /** Who said it, as a hierarchical path, e.g. ["graphty", "layout", "ngraph"]. */
    readonly category: readonly string[];
    /** What they said, unformatted. {@link formatLogRecord} is the element's own rendering of it. */
    readonly message: string;
    /** The facts attached to it, with every lazy value already computed. */
    readonly data?: Readonly<Record<string, unknown>>;
    /** The failure itself, on an error record: the `Error` object, not a stack string. */
    readonly error?: Error;
}

/**
 * A destination log records are delivered to: the console, a log server, a panel in a page.
 *
 * A plain object, not a class to extend. The element's own two destinations are exactly this
 * shape, so what a third party writes is what the element writes.
 *
 * `write` is synchronous and fire-and-forget: a promise it returns is neither awaited nor
 * caught, so an `async write` that rejects becomes an unhandled rejection rather than the
 * caught, reported failure a synchronous throw gets. A destination that talks to a network
 * buffers inside `write` and does the talking in `flush`, which is what the element's own remote
 * destination does.
 */
export interface Sink {
    /** The name it is filed under, and the name `removeSink` takes. */
    name: string;
    /** Deliver one record. Anything thrown here is caught and reported, and the other destinations still get the record. */
    write(record: LogRecord): void;
    /** Send anything buffered, when there is any. One destination's rejection does not stop another's. */
    flush?(): Promise<void>;
    /**
     * Take less than the global settings allow: records above this level are not delivered here.
     *
     * It NARROWS and cannot widen -- a destination cannot see what the global level already
     * dropped, because the element's own destinations are behind that same gate.
     */
    level?: LogLevel;
    /**
     * Take only records whose category contains one of these segments, e.g. ["layout"].
     *
     * Matched the way the global module filter is matched: by segment, so "layout" takes
     * ["graphty", "layout", "ngraph"] as well as ["graphty", "layout"].
     */
    categories?: readonly string[];
    /**
     * Let go of whatever the destination is holding -- a timer, a socket, a queue.
     *
     * Called when the destination is removed and when another one replaces its name. The
     * element's own remote destination needs it: its client holds a batch timer that nothing
     * stopped before this existed.
     */
    dispose?(): void | Promise<void>;
}

/**
 * Configuration for the logging system.
 */
export interface LoggerConfig {
    /** Whether logging is enabled */
    enabled: boolean;
    /** Minimum log level to output */
    level: LogLevel;
    /** Modules to enable: array of module names or "*" for all */
    modules: string[] | "*";
    /**
     * A level for one module that is not the global level, e.g. `{ layout: LogLevel.TRACE }`.
     *
     * Keyed by a category segment and matched the way `modules` is matched, so "layout" covers
     * ["graphty", "layout", "ngraph"]. The most specific segment of a category wins. This is
     * what the documented `?graphty-element-logging=layout:debug,xr:info` URL syntax means.
     */
    moduleLevels?: Readonly<Record<string, LogLevel>>;
    /** Formatting options */
    format: {
        /** Include timestamp in output */
        timestamp: boolean;
        /** Format for timestamps (default: ISO) */
        timestampFormat?: string;
        /** Include module name in output */
        module: boolean;
        /** Enable colored output (for console) */
        colors?: boolean;
    };
}

/**
 * Map of log level names to their enum values.
 */
export const LOG_LEVEL_NAMES: Record<string, LogLevel> = {
    silent: LogLevel.SILENT,
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    debug: LogLevel.DEBUG,
    trace: LogLevel.TRACE,
};

/**
 * Map of log level enum values to their names.
 */
export const LOG_LEVEL_TO_NAME: Record<LogLevel, string> = {
    [LogLevel.SILENT]: "SILENT",
    [LogLevel.ERROR]: "ERROR",
    [LogLevel.WARN]: "WARN",
    [LogLevel.INFO]: "INFO",
    [LogLevel.DEBUG]: "DEBUG",
    [LogLevel.TRACE]: "TRACE",
};

/**
 * Parse a log level string to its enum value.
 * @param level - The level string (case-insensitive)
 * @returns The LogLevel enum value or undefined if invalid
 */
export function parseLogLevel(level: string): LogLevel | undefined {
    return LOG_LEVEL_NAMES[level.toLowerCase()];
}
