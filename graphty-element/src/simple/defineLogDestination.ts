/**
 * @file `defineLogDestination`: the simple tier's log destination verb.
 *
 * It builds an ordinary `LogSinkRegistration` -- a descriptor derived from the definition and a
 * `create` that returns a `Sink` -- and hands it to `registerLogSink`, the advanced tier's own
 * verb, so the registry cannot tell which tier produced it. Then it attaches one sink under the
 * id, unless the definition says `attach: false`.
 *
 * WHAT THE WRAPPED SINK ADDS. The author's `write` receives a `PlainLogRecord` (the level as a
 * word, the category as one dotted string, the error as plain data). A `write` that returns a
 * promise is queued: records go out one at a time and in order, a rejection or a `Response`
 * whose `ok` is false is retried after 1, 2 and 4 seconds (never a 4xx other than 408 or 429),
 * at most 1000 records wait, `flush` awaits the queue and `dispose` drains it with a timeout.
 * A `write` that returns nothing is called synchronously, exactly as an advanced sink is.
 *
 * THE DELIVERY RULE IS EVERY DESTINATION'S: the destination sits behind the same global gate as
 * every other sink, so while logging is off (the default) it receives nothing.
 * `GraphtyLogger.addSink` and advanced sinks are unchanged: the queue lives in this wrapper only.
 */

import { type LogSinkRegistration, registerLogSink } from "../catalog/logSinkRegistry";
import type { RegisterOptions } from "../catalog/pluginRegistry";
import { GraphtyLogger } from "../logging/GraphtyLogger";
import { LogLevel, type LogRecord, type Sink } from "../logging/types";
import { badDefinition, checkDefinition, describeValue, displayName, optionalOneOf, requireFunction } from "./definition";
import type { LogDestinationDefinition, LogLevelName, PlainLogRecord } from "./types";

/** The five level words, in the order of `LogLevel` from ERROR (1) to TRACE (5). */
const LEVELS: readonly LogLevelName[] = ["error", "warn", "info", "debug", "trace"];

/** How many records may wait behind the one being sent. */
const QUEUE_LIMIT = 1000;

/** The waits before each retry of a failed send. */
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/** How long a detached destination gets to send what is still waiting. */
const DRAIN_TIMEOUT_MS = 5000;

/** The registration built for each definition object, so defining it again is a no-op. */
const registrations = new WeakMap<LogDestinationDefinition, LogSinkRegistration>();

let flushesOnPagehide = false;

/**
 * The record as a simple destination receives it.
 * @param record - The element's record.
 * @returns The plain, frozen record.
 */
function toPlain(record: LogRecord): PlainLogRecord {
    const { error } = record;
    return Object.freeze({
        time: record.timestamp,
        level: LEVELS[record.level - 1] ?? "error",
        category: record.category.join("."),
        message: record.message,
        ...(record.data === undefined ? {} : { data: record.data }),
        ...(error === undefined
            ? {}
            : {
                  error: Object.freeze({
                      name: error.name,
                      message: error.message,
                      ...(error.stack === undefined ? {} : { stack: error.stack }),
                  }),
              }),
    });
}

/** What one send came to. */
type Outcome = { readonly ok: true } | { readonly ok: false; readonly retry: boolean; readonly cause: unknown };

/**
 * Wait for one send and decide whether it failed and whether to try again.
 * @param pending - What `write` returned.
 * @returns The outcome.
 */
async function settle(pending: unknown): Promise<Outcome> {
    try {
        const value: unknown = await pending;
        if (typeof value === "object" && value !== null && "ok" in value && "status" in value && value.ok === false) {
            const status = Number(value.status);
            const clientFault = status >= 400 && status < 500 && status !== 408 && status !== 429;
            return { ok: false, retry: !clientFault, cause: `HTTP ${String(status)}` };
        }

        return { ok: true };
    } catch (cause) {
        return { ok: false, retry: true, cause };
    }
}

/**
 * The sink a simple definition runs as.
 * @param id - The definition's id, which the sink is attached under.
 * @param definition - The checked definition.
 * @returns The sink.
 */
function createSimpleSink(id: string, definition: LogDestinationDefinition): Sink {
    const { write } = definition;
    const queue: PlainLogRecord[] = [];
    let dropped = 0;
    let closed = false;
    /** The running send loop, while one is running. */
    let pump: Promise<void> | undefined;

    const send = async (record: PlainLogRecord, first?: unknown): Promise<void> => {
        let pending = first ?? Promise.resolve().then(() => write(record));
        for (let tries = 0; ; tries++) {
            const outcome = await settle(pending);
            if (outcome.ok) {
                return;
            }

            if (!outcome.retry || tries === RETRY_DELAYS_MS.length || closed) {
                // The console, never the logger: a delivery failure logged through the logger recurses.
                console.error(
                    `[GraphtyLogger] Log destination "${id}" could not send a record after ${String(tries + 1)} attempt(s):`,
                    outcome.cause,
                );
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[tries]));
            pending = Promise.resolve().then(() => write(record));
        }
    };

    const drain = async (record: PlainLogRecord, first: unknown): Promise<void> => {
        await send(record, first);
        while (!closed && (queue.length > 0 || dropped > 0)) {
            if (dropped > 0) {
                const count = dropped;
                dropped = 0;
                await send(
                    Object.freeze({
                        time: new Date(),
                        level: "warn",
                        category: "graphty.logging",
                        message: `${String(count)} log records were dropped because "${id}" could not send them as fast as they were made.`,
                    }),
                );
            }

            const next = queue.shift();
            if (next !== undefined) {
                await send(next);
            }
        }

        pump = undefined;
    };

    return {
        name: id,
        level: (LEVELS.indexOf(definition.level ?? "warn") + 1) as LogLevel,
        ...(definition.categories === undefined ? {} : { categories: [...definition.categories] }),
        write(record: LogRecord): void {
            if (closed) {
                return;
            }

            const plain = toPlain(record);
            if (pump !== undefined) {
                queue.push(plain);
                if (queue.length > QUEUE_LIMIT) {
                    queue.shift();
                    dropped += 1;
                }

                return;
            }

            // Called at once, so a synchronous write is delivered before the log call returns.
            const result: unknown = write(plain);
            if (result instanceof Promise || (typeof result === "object" && result !== null && "then" in result)) {
                pump = drain(plain, result);
            }
        },
        flush: () => pump ?? Promise.resolve(),
        async dispose(): Promise<void> {
            if (pump !== undefined) {
                let timer: ReturnType<typeof setTimeout> | undefined;
                await Promise.race([pump, new Promise((resolve) => (timer = setTimeout(resolve, DRAIN_TIMEOUT_MS)))]);
                clearTimeout(timer);
            }

            closed = true;
            queue.length = 0;
        },
    };
}

/**
 * Refuse what a log destination definition cannot hold, before anything is registered.
 * @param definition - What the author passed.
 * @returns The definition, checked.
 */
function checkLogDestination(definition: unknown): ReturnType<typeof checkDefinition> {
    const checked = checkDefinition("defineLogDestination", definition);
    requireFunction("defineLogDestination", checked, "write");

    const { level, categories } = checked;
    if (level !== undefined && !LEVELS.includes(level as LogLevelName)) {
        throw badDefinition(
            "defineLogDestination",
            checked.id,
            "level",
            `"level" must be one of "error", "warn", "info", "debug" or "trace"; got ${describeValue(level)}.`,
        );
    }

    if (
        categories !== undefined &&
        !(Array.isArray(categories) && categories.every((word) => typeof word === "string" && word !== ""))
    ) {
        throw badDefinition(
            "defineLogDestination",
            checked.id,
            "categories",
            `"categories" must be a list of words such as ["layout"]; got ${describeValue(categories)}.`,
        );
    }

    optionalOneOf("defineLogDestination", checked, "attach", [true, false]);
    return checked;
}

/**
 * Register a log destination from a plain definition object, and attach it unless it says
 * `attach: false`.
 * @param definition - The id, the level and categories it takes, and `write`.
 * @param options - Whether a collision with an existing registration throws instead of replacing.
 * @returns A function that detaches the destination.
 * @throws A GraphtyError `E_BAD_COMMAND` naming the member at fault, or `E_DUPLICATE_PLUGIN` for
 * an id the element keeps for its own destinations.
 */
export function defineLogDestination(definition: LogDestinationDefinition, options?: RegisterOptions): () => void {
    const checked = checkLogDestination(definition);
    const { id } = checked;
    const registration: LogSinkRegistration = registrations.get(definition) ?? {
        descriptor: { id, plainName: displayName(checked), description: typeof checked.description === "string" ? checked.description : "", options: [] },
        create: () => createSimpleSink(id, checked as unknown as LogDestinationDefinition),
    };

    registerLogSink(registration, options);
    registrations.set(definition, registration);

    if (!flushesOnPagehide && typeof window !== "undefined") {
        flushesOnPagehide = true;
        window.addEventListener("pagehide", () => void GraphtyLogger.flush());
    }

    const sink = checked.attach === false ? undefined : registration.create({});
    if (sink !== undefined) {
        GraphtyLogger.addSink(sink);
    }

    // Detaches only the destination THIS call attached: an old handle must not remove a later
    // definition under the same id.
    return () => {
        if (sink !== undefined && GraphtyLogger.getSinks().includes(sink)) {
            GraphtyLogger.removeSink(id);
        }
    };
}

