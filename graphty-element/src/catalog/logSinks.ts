/**
 * @file The log destination catalogue: where the element's log records can be delivered.
 *
 * WHY LOGGING HAS A CATALOGUE TABLE AT ALL. The alternative was to write down that Logging is
 * exempt from the "appears in `session.catalog`" clause. It is not exempt: once a destination has
 * a name and a plain name -- which the factory registry requires anyway, so a configuration can
 * say `{ use: "acme-collector" }` -- a settings panel can be built from the list, and the list
 * costs one file.
 *
 * The element ships two destinations. The console is the one every developer sees and, until the
 * sinks were unified, was not a sink at all: it was wired behind a one-shot latch, `getSinks()`
 * did not list it, and `removeSink("console")` did not detach it -- so a consumer who wanted
 * element logs to go ONLY to their own collector could not turn the element's own output off.
 *
 * The options below describe what each destination's factory accepts, in the same
 * `OptionDescriptor` vocabulary every other extension point uses, so a settings panel renders a
 * built-in destination and a registered one with the same code.
 */

import { registeredLogSinkById } from "./logSinkRegistry";
import type { LogSinkDescriptor, LogSinkId } from "./types";

/** Every log destination the element ships. */
export const LOG_SINK_DESCRIPTORS: readonly LogSinkDescriptor[] = Object.freeze([
    {
        id: "console",
        plainName: "Browser console",
        description: "Writes each record to the developer console, one line per record.",
        options: [
            {
                name: "colors",
                plainName: "Coloured output",
                type: "boolean",
                // TRUE BECAUSE THAT IS WHAT THE ELEMENT ACTUALLY DOES. The console the element
                // attaches reads `format.colors ?? true`, so a descriptor saying false made a
                // settings panel built from this table show "Coloured output: off" while the
                // element was colouring, and `configure({ sinks: [{ use: "console" }] })`
                // silently turned colour off by filling in a default nobody chose.
                default: true,
                description: "Tint each line by its level.",
            },
        ],
    },
    {
        id: "remote",
        plainName: "Remote log server",
        description:
            "Batches records and posts them to a log server, for a device whose console nobody can see -- " +
            "a headset, a phone, a kiosk.",
        options: [
            {
                name: "serverUrl",
                plainName: "Server address",
                type: "string",
                description: "Where records are posted, such as http://localhost:9080.",
            },
            {
                name: "sessionPrefix",
                plainName: "Session prefix",
                type: "string",
                default: "graphty",
                description: "Prefixes the session id each batch is filed under.",
            },
            {
                name: "batchIntervalMs",
                plainName: "Batch interval",
                type: "integer",
                default: 100,
                min: 0,
                description: "How long records are collected before a batch is sent, in milliseconds.",
            },
            {
                name: "maxRetries",
                plainName: "Retries",
                type: "integer",
                default: 3,
                min: 0,
                description: "How many times a failed batch is resent before it is dropped.",
            },
            {
                name: "retryDelayMs",
                plainName: "Retry delay",
                type: "integer",
                default: 1000,
                min: 0,
                description: "How long to wait between retries, in milliseconds.",
            },
            {
                name: "throttleMs",
                plainName: "Throttle window",
                type: "integer",
                default: 5000,
                min: 0,
                description: "How long a repeated message is suppressed for, in milliseconds.",
            },
        ],
    },
] satisfies readonly LogSinkDescriptor[]);

/**
 * Find one log destination by its name.
 *
 * The element's own destinations are searched first, so a registration can never change what an
 * existing name means.
 * @param id - The destination name, such as "remote".
 * @returns The descriptor, or undefined when nothing answers to that name.
 */
export function logSinkDescriptor(id: LogSinkId): LogSinkDescriptor | undefined {
    return LOG_SINK_DESCRIPTORS.find((descriptor) => descriptor.id === id) ?? registeredLogSinkById(id)?.descriptor;
}
