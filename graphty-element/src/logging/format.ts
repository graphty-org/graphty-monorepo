/**
 * @file The one line the element renders a log record as.
 *
 * WHY THIS IS PUBLISHED. Before it existed there were three renderings of the same record and no
 * way for anyone else to get any of them: the console line the element printed, the console
 * destination's own default, and the remote destination's, all different, all private. A third
 * party writing a destination had to invent a fourth, and their collector's output could not be
 * read beside the element's own.
 *
 * Both of the element's destinations call this, and so can anybody else's, which is the whole
 * point: one record renders to one line no matter who is holding it.
 */

import { getLoggingConfig } from "./LoggerConfig.js";
import { LOG_LEVEL_TO_NAME, type LogRecord } from "./types.js";

/** What to leave out of the line. Anything not given follows the current logging configuration. */
export interface LogFormatOptions {
    /** Lead with the time the record was made, in ISO form. */
    readonly timestamp?: boolean;
    /** Name who said it, as its dotted category path. */
    readonly module?: boolean;
}

/**
 * Render one record as the element renders its own: `[time] [category] [LEVEL] message`.
 *
 * The parts are omitted rather than blanked, so a line with neither a time nor a category is
 * `[INFO] message` and not two empty brackets.
 * @param record - The record to render.
 * @param options - What to leave out. Defaults to the current logging configuration's format.
 * @returns The line, with no trailing newline and no structured data -- `record.data` is passed
 * to a console or a server beside the line rather than flattened into it.
 */
export function formatLogRecord(record: LogRecord, options?: LogFormatOptions): string {
    const { format } = getLoggingConfig();
    const withTimestamp = options?.timestamp ?? format.timestamp;
    const withModule = options?.module ?? format.module;
    const parts: string[] = [];

    if (withTimestamp) {
        parts.push(`[${record.timestamp.toISOString()}]`);
    }

    if (withModule) {
        parts.push(`[${record.category.join(".")}]`);
    }

    parts.push(`[${LOG_LEVEL_TO_NAME[record.level]}]`);
    parts.push(record.message);

    return parts.join(" ");
}
