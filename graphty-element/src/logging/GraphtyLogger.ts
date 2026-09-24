/**
 * @file Where a log record is made, filtered and handed to the destinations that want it.
 *
 * EVERY DESTINATION IS A SINK, INCLUDING THE CONSOLE. The console used to be wired somewhere
 * else entirely -- behind a one-shot latch, outside the registry -- so `getSinks()` did not list
 * it, `removeSink("console")` did not detach it, and a consumer who wanted the element's records
 * to go only to their own collector could not have that. It is an ordinary `Sink` now, built by
 * `createConsoleSink` and registered under the name "console" whenever the logging system is
 * configured. Two things follow: the console can be detached like anything else, and a record
 * from ANY category reaches it -- a plugin logging under its own name used to reach every
 * registered destination and never the console, so its records were invisible to a developer
 * watching devtools.
 *
 * A DESTINATION IS REACHABLE BY A NAME, NOT ONLY BY A REFERENCE. `sinks` accepts a live object
 * and also `{ use: "acme-collector", options: { ... } }`, resolved through the log destinations
 * registered with `registerLogSink`. That is what the element's own remote destination always
 * had -- a string in a config object turns it on -- and what a third party's destination had
 * nothing of: no key a settings panel could store, nothing a saved configuration could name.
 * An unknown name is `E_UNKNOWN_SINK`; a value its factory would not accept is `E_OPTION_RANGE`
 * or `E_UNKNOWN_OPTION`, the same as for every other extension point.
 *
 * ONE RECORD, HANDED TO EVERY DESTINATION, FROZEN. The same object goes to each destination in
 * turn, so a destination that edited it would edit what every destination after it sees. It is
 * frozen before the first one gets it, and so is its data.
 *
 * RECORDS MADE BEFORE A DESTINATION IS ATTACHED ARE NOT REPLAYED, and this is decided rather
 * than inherited. A backlog would separate the time a record carries from the time it arrives,
 * and it would have to be bounded, so the promise would be "some of what you missed". The
 * element's own console loses exactly the same records, which is what makes this parity: the
 * answer for a consumer who needs the first records is to configure the destination by name
 * before the element is created, which the named registry is what makes possible.
 */

import { registeredLogSinkById, registeredLogSinkDescriptors } from "../catalog/logSinkRegistry.js";
import { logSinkDescriptor } from "../catalog/logSinks.js";
import { resolveOptionValues } from "../catalog/options.js";
import { GraphtyError } from "../errors/index.js";
import { formatLogRecord } from "./format.js";
import { resolveDataObject } from "./LazyEval.js";
import { configureLogging, getLoggingConfig, isModuleEnabled, levelForCategory } from "./LoggerConfig.js";
import { createConsoleSink } from "./sinks/ConsoleSink.js";
import { createRemoteSink } from "./sinks/RemoteSink.js";
import { type LoggerConfig, LogLevel, type LogRecord, type Sink } from "./types.js";

/**
 * Logger interface providing typed logging methods.
 */
export interface Logger {
    /** Log a trace message (most verbose) */
    trace(message: string, data?: Record<string, unknown>): void;
    /** Log a debug message */
    debug(message: string, data?: Record<string, unknown>): void;
    /** Log an info message */
    info(message: string, data?: Record<string, unknown>): void;
    /** Log a warning message */
    warn(message: string, data?: Record<string, unknown>): void;
    /** Log an error message */
    error(message: string, error?: Error, data?: Record<string, unknown>): void;
    /** Check if trace level is enabled */
    isTraceEnabled(): boolean;
    /** Check if debug level is enabled */
    isDebugEnabled(): boolean;
}

/**
 * A destination named by a configuration rather than handed over as a live object.
 *
 * This is plain JSON, which is the entire point: it survives a settings panel, a saved document
 * and a page reload, none of which can hold a JavaScript object.
 */
export interface LogSinkReference {
    /** The destination's registered name, such as "remote" or a third party's own id. */
    readonly use: string;
    /** What to configure it with, checked against the options its descriptor declares. */
    readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * Cache of logger instances by category key.
 */
const loggerCache = new Map<string, Logger>();

/**
 * Registry of sinks, the element's own console included, in the order they were attached.
 */
const sinkRegistry = new Map<string, Sink>();

/**
 * Remote log server URL (if configured).
 */
let remoteLogUrl: string | undefined;

/**
 * Create a category key from a category array.
 * @param category - Hierarchical category path
 * @returns A dot-separated string key
 */
function categoryKey(category: readonly string[]): string {
    return category.join(".");
}

/**
 * Let a destination go, without letting its failure reach the caller who detached it.
 * @param sink - The destination being detached or replaced.
 */
function disposeSink(sink: Sink): void {
    if (!sink.dispose) {
        return;
    }

    try {
        const finished: void | Promise<void> = sink.dispose();
        if (finished instanceof Promise) {
            finished.catch((err: unknown) => {
                console.error(`[GraphtyLogger] Error disposing sink "${sink.name}":`, err);
            });
        }
    } catch (err) {
        console.error(`[GraphtyLogger] Error disposing sink "${sink.name}":`, err);
    }
}

/**
 * Whether one destination's own filter lets a record through.
 *
 * A destination's filter NARROWS: it is applied after the global gate, so a destination can take
 * less than the configuration allows and never more. Widening would change what every other
 * destination sees, and the element's own remote destination sits behind the same global gate.
 * @param sink - The destination.
 * @param record - The record being delivered.
 * @returns Whether this destination wants it.
 */
function sinkAccepts(sink: Sink, record: LogRecord): boolean {
    if (sink.level !== undefined && record.level > sink.level) {
        return false;
    }

    if (sink.categories !== undefined && sink.categories.length > 0) {
        return sink.categories.some((segment) => record.category.includes(segment));
    }

    return true;
}

/**
 * Hand one record to every destination that wants it.
 * @param record - The log record to dispatch
 */
function dispatchToSinks(record: LogRecord): void {
    if (record.data) {
        Object.freeze(record.data);
    }

    Object.freeze(record);

    for (const sink of sinkRegistry.values()) {
        if (!sinkAccepts(sink, record)) {
            continue;
        }

        try {
            sink.write(record);
        } catch (err) {
            // A destination that fails must not silence the others, and must not take down
            // whatever was being logged. Reported straight to the console rather than through a
            // logger, because a logging failure logged through the logger re-enters this loop.
            console.error(`[GraphtyLogger] Error in sink "${sink.name}":`, err);
        }
    }
}

/**
 * Create a Logger wrapper that checks module enablement and dispatches to every destination.
 * @param category - Hierarchical category path
 * @returns A wrapped Logger instance with filtering
 */
function createLoggerWrapper(category: string[]): Logger {
    const emit = (level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void => {
        const config = getLoggingConfig();

        // Skip if logging is disabled or module not enabled
        if (!config.enabled || !isModuleEnabled(category)) {
            return;
        }

        // Skip if the level is below the one configured for this category
        if (level > levelForCategory(category)) {
            return;
        }

        // Resolve lazy values in data object (only when actually logging)
        const resolvedData = data ? resolveDataObject(data) : undefined;

        dispatchToSinks({
            timestamp: new Date(),
            level,
            category,
            message,
            data: resolvedData,
            error,
        });
    };

    const makeLogFn = (level: LogLevel) => {
        return (message: string, data?: Record<string, unknown>): void => {
            emit(level, message, data);
        };
    };

    const enabledDownTo = (level: LogLevel): boolean => {
        const config = getLoggingConfig();
        return config.enabled && isModuleEnabled(category) && levelForCategory(category) >= level;
    };

    return {
        trace: makeLogFn(LogLevel.TRACE),
        debug: makeLogFn(LogLevel.DEBUG),
        info: makeLogFn(LogLevel.INFO),
        warn: makeLogFn(LogLevel.WARN),
        error: (message: string, error?: Error, data?: Record<string, unknown>): void => {
            emit(LogLevel.ERROR, message, data, error);
        },
        isTraceEnabled: (): boolean => enabledDownTo(LogLevel.TRACE),
        isDebugEnabled: (): boolean => enabledDownTo(LogLevel.DEBUG),
    };
}

/**
 * Extended configuration options for GraphtyLogger.
 *
 * Every member is optional and what is absent keeps the value it has, so attaching a destination
 * does not quietly put the level and the module filter back to their defaults.
 */
export interface GraphtyLoggerConfig extends Partial<LoggerConfig> {
    /** URL of remote log server (e.g., `https://localhost:9080`) */
    remoteLogUrl?: string;
    /** Destinations to attach: a live object, or the name of a registered one and its options. */
    sinks?: readonly (Sink | LogSinkReference)[];
}

/**
 * Build the console destination from plain option values.
 * @param options - The option values, already checked against the console descriptor.
 * @returns The destination.
 */
function consoleSinkFrom(options: Readonly<Record<string, unknown>>): Sink {
    return createConsoleSink({ colors: options.colors === true });
}

/**
 * The number a descriptor declared, when the caller passed one.
 * @param value - The resolved option value.
 * @returns The number, or undefined so the sink's own default applies.
 */
function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
}

/**
 * Build the remote destination from plain option values.
 * @param options - The option values, already checked against the remote descriptor.
 * @returns The destination.
 */
function remoteSinkFrom(options: Readonly<Record<string, unknown>>): Sink {
    return createRemoteSink({
        serverUrl: typeof options.serverUrl === "string" ? options.serverUrl : "",
        sessionPrefix: typeof options.sessionPrefix === "string" ? options.sessionPrefix : undefined,
        batchIntervalMs: numberOrUndefined(options.batchIntervalMs),
        maxRetries: numberOrUndefined(options.maxRetries),
        retryDelayMs: numberOrUndefined(options.retryDelayMs),
        throttleMs: numberOrUndefined(options.throttleMs),
    });
}

/*
 * The element's own destinations, built from plain option values, so that naming one of them in
 * a configuration and naming a third party's go down the same path -- the descriptor's options
 * are checked, the defaults are filled in, and the factory is handed data.
 *
 * A value read out of a stored configuration or a URL is `unknown` until the descriptor has been
 * checked against it, which `resolveOptionValues` has already done by the time a factory here
 * runs; the narrowing below is what turns a checked value into the argument a factory takes.
 */
const BUILT_IN_SINK_FACTORIES = new Map<string, (options: Readonly<Record<string, unknown>>) => Sink>([
    ["console", consoleSinkFrom],
    ["remote", remoteSinkFrom],
]);

/**
 * Every destination name a configuration could use right now.
 * @returns The element's own names, then whatever was registered.
 */
function availableSinkIds(): string[] {
    return [...BUILT_IN_SINK_FACTORIES.keys(), ...registeredLogSinkDescriptors().map((descriptor) => descriptor.id)];
}

/**
 * Refuse a name nothing answers to, saying what does.
 * @param id - The name a configuration used.
 * @throws A `GraphtyError` with `E_UNKNOWN_SINK`.
 */
function unknownSink(id: string): never {
    throw new GraphtyError({
        code: "E_UNKNOWN_SINK",
        message:
            `nothing is registered as the log destination "${id}". ` +
            "Register it with registerLogSink before naming it in a configuration.",
        source: "config",
        details: { kind: "sink", name: id, available: availableSinkIds() },
    });
}

/**
 * Build the destination a configuration named.
 * @param reference - The name and the options a configuration wrote down.
 * @returns The destination its factory built.
 * @throws A `GraphtyError` with `E_UNKNOWN_SINK` when nothing answers to that name, or with
 * `E_UNKNOWN_OPTION` / `E_OPTION_RANGE` when its factory would not accept the options.
 */
function buildNamedSink(reference: LogSinkReference): Sink {
    const id = reference.use;
    const passed = reference.options ?? {};
    const registered = registeredLogSinkById(id);

    if (registered) {
        return registered.create(resolveOptionValues(registered.descriptor.options, passed, { kind: "sink", id }));
    }

    const builtIn = BUILT_IN_SINK_FACTORIES.get(id);
    const descriptor = logSinkDescriptor(id);

    if (!builtIn || !descriptor) {
        unknownSink(id);
    }

    return builtIn(resolveOptionValues(descriptor.options, passed, { kind: "sink", id }));
}

/**
 * Attach a destination, letting go of whatever it replaced.
 * @param sink - The destination to attach.
 */
function addSink(sink: Sink): void {
    const replaced = sinkRegistry.get(sink.name);

    if (replaced && replaced !== sink) {
        disposeSink(replaced);
    }

    sinkRegistry.set(sink.name, sink);
}

/**
 * Configure the logging system.
 * @param config - What to change. What is absent keeps the value it has.
 * @returns A promise that is already settled: the configuration takes effect before this
 * returns, so a caller that does not await it still loses no records.
 * @throws A `GraphtyError` with `E_UNKNOWN_SINK` when `sinks` names a destination nothing
 * registered.
 */
function configureGraphtyLogging(config: GraphtyLoggerConfig): Promise<void> {
    configureLogging(config);

    // The console is a destination like any other, so it is attached the same way. Re-attaching
    // the same name replaces it, which is what makes a change to format.colors take effect.
    addSink(createConsoleSink({ colors: getLoggingConfig().format.colors ?? true }));

    // Configure remote logging if URL is provided
    const { remoteLogUrl: newRemoteLogUrl } = config;
    if (newRemoteLogUrl && newRemoteLogUrl !== remoteLogUrl) {
        remoteLogUrl = newRemoteLogUrl;
        addSink(createRemoteSink({ serverUrl: newRemoteLogUrl }));
    }

    for (const entry of config.sinks ?? []) {
        addSink("write" in entry ? entry : buildNamedSink(entry));
    }

    // Clear logger cache when reconfiguring
    loggerCache.clear();

    return Promise.resolve();
}

/**
 * Remove a sink by name.
 * @param name - The name of the sink to remove
 * @returns true if the sink was removed, false if it didn't exist
 */
function removeSink(name: string): boolean {
    const sink = sinkRegistry.get(name);

    if (!sink) {
        return false;
    }

    sinkRegistry.delete(name);
    disposeSink(sink);

    if (name === "remote") {
        // So that a later configure() with the same URL attaches it again rather than deciding
        // nothing has changed.
        remoteLogUrl = undefined;
    }

    return true;
}

/**
 * Get all registered sinks.
 * @returns Array of registered sinks
 */
function getSinks(): Sink[] {
    return Array.from(sinkRegistry.values());
}

/**
 * Flush every destination that buffers, each one on its own.
 *
 * One destination's failure is reported and does not reject the caller's flush: otherwise a
 * third party's collector could hide whether the element's own remote destination got its
 * records out.
 */
async function flushSinks(): Promise<void> {
    const flushes: Promise<void>[] = [];

    for (const sink of sinkRegistry.values()) {
        if (sink.flush) {
            flushes.push(
                sink.flush().catch((err: unknown) => {
                    console.error(`[GraphtyLogger] Error flushing sink "${sink.name}":`, err);
                }),
            );
        }
    }

    await Promise.all(flushes);
}

/**
 * Get a logger for the specified category.
 * @param category - Hierarchical category path, e.g., ["graphty", "layout", "ngraph"]
 * @returns Logger instance for the category
 */
function getGraphtyLogger(category: string[]): Logger {
    const key = categoryKey(category);

    // Return cached logger if available
    const cached = loggerCache.get(key);
    if (cached) {
        return cached;
    }

    const logger = createLoggerWrapper(category);
    loggerCache.set(key, logger);

    return logger;
}

/**
 * Check if logging is enabled.
 * @returns true if logging is enabled
 */
function isLoggingEnabled(): boolean {
    return getLoggingConfig().enabled;
}

/**
 * Main logger facade for graphty-element.
 *
 * Usage:
 * ```typescript
 * import { GraphtyLogger, LogLevel } from "@graphty/graphty-element/logging";
 *
 * // Configure logging
 * await GraphtyLogger.configure({
 *     enabled: true,
 *     level: LogLevel.DEBUG,
 *     modules: "*",
 *     format: { timestamp: true, module: true },
 * });
 *
 * // Get a logger for a category
 * const logger = GraphtyLogger.getLogger(["graphty", "layout"]);
 * logger.info("Layout started", { nodeCount: 100 });
 *
 * // Configure with remote logging
 * await GraphtyLogger.configure({ remoteLogUrl: "https://localhost:9080" });
 *
 * // Attach a destination by handing over the object...
 * GraphtyLogger.addSink({
 *     name: "custom",
 *     write: (record) => { ... },
 * });
 *
 * // ...or by naming one that registerLogSink registered, which a stored configuration can do
 * await GraphtyLogger.configure({ sinks: [{ use: "acme-collector", options: { capacity: 200 } }] });
 * ```
 */
export const GraphtyLogger = {
    /**
     * Configure the logging system.
     */
    configure: configureGraphtyLogging,

    /**
     * Get a logger for the specified category.
     */
    getLogger: getGraphtyLogger,

    /**
     * Check if logging is enabled.
     */
    isEnabled: isLoggingEnabled,

    /**
     * Add a custom sink to the logger.
     */
    addSink,

    /**
     * Remove a sink by name.
     */
    removeSink,

    /**
     * Get all registered sinks.
     */
    getSinks,

    /**
     * Flush all sinks that support flushing.
     */
    flush: flushSinks,

    /**
     * Render a record the way the element renders its own console line.
     */
    formatRecord: formatLogRecord,
};

export { formatLogRecord } from "./format.js";
