/* eslint-disable no-console -- This is a console sink, console usage is intentional */
import { formatLogRecord } from "../format.js";
import { LogLevel, type LogRecord, type Sink } from "../types.js";

/**
 * Options for the console sink.
 */
export interface ConsoleSinkOptions {
    /** Render each record differently from the element's own line. */
    formatter?: (record: LogRecord) => string;
    /**
     * Let the browser tint each line by its severity.
     *
     * On means each record goes to the console method that matches its level, and a browser
     * paints `console.error` red and `console.warn` yellow. Off means every record goes to
     * `console.log`, which is painted like any other output -- what a developer wants when the
     * page's own red lines are the ones they are looking for.
     */
    colors?: boolean;
}

/**
 * The console method whose default styling matches a level.
 * @param level - The log level.
 * @returns The method name to call on `console`.
 */
function methodForLevel(level: LogLevel): "error" | "warn" | "info" | "debug" {
    switch (level) {
        case LogLevel.ERROR:
            return "error";
        case LogLevel.WARN:
            return "warn";
        case LogLevel.INFO:
            return "info";
        default:
            return "debug";
    }
}

/**
 * Everything to print beside the line: the record's own facts, plus the failure as a stack.
 *
 * The record carries the `Error` object itself, which is what a destination that files bug
 * reports wants. A console wants the stack as text, because an `Error` in a console's second
 * argument collapses to "Error" until somebody expands it.
 * @param record - The record being printed.
 * @returns The extra facts, or undefined when there are none and the line stands alone.
 */
function extrasFor(record: LogRecord): Record<string, unknown> | undefined {
    const extra: Record<string, unknown> = { ...record.data };

    if (record.error) {
        extra.error = record.error.stack ?? record.error.message;
    }

    return Object.keys(extra).length > 0 ? extra : undefined;
}

/**
 * Create the destination that writes to the developer console.
 *
 * This is the element's own primary destination, and it is an ordinary `Sink`: it is listed by
 * `GraphtyLogger.getSinks()` and `GraphtyLogger.removeSink("console")` detaches it, so a
 * consumer who wants the element's records to go only to their own collector can have that.
 * @param options - Sink configuration options.
 * @returns A Sink that writes to the console.
 */
export function createConsoleSink(options: ConsoleSinkOptions = {}): Sink {
    const formatter = options.formatter ?? formatLogRecord;
    const colors = options.colors ?? true;

    return {
        name: "console",
        write(record: LogRecord): void {
            const message = formatter(record);
            const method = colors ? methodForLevel(record.level) : "log";
            const extra = extrasFor(record);

            if (extra) {
                console[method](message, extra);
            } else {
                console[method](message);
            }
        },
    };
}
