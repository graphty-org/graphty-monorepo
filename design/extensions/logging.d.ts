/**
 * Logging extension point. NORMATIVE for shapes; behaviour in design/extensions/logging.md.
 * Entry points: @graphty/graphty-element/extend (registerLogSink and the descriptor types) and
 * @graphty/graphty-element/logging (LogLevel, LogRecord, Sink, GraphtyLogger). Serialised form of
 * the descriptor: design/extensions/descriptors.schema.json#/$defs/LogSinkDescriptor.
 */
import type { OptionDescriptor, RegisterOptions } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** ./logging. Lower is more severe. CLOSED. */
export declare enum LogLevel {
    SILENT = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5,
}

/** ./logging. One record, frozen (data included) before the first destination sees it. CALLED BY EXTENSIONS. */
export interface LogRecord {
    readonly timestamp: Date;
    readonly level: LogLevel;
    /** Hierarchical path, e.g. ["graphty", "layout", "ngraph"]. */
    readonly category: readonly string[];
    readonly message: string;
    /** Attached facts, lazy values already computed. MAY contain graph data (see logging.md 7). */
    readonly data?: Readonly<Record<string, unknown>>;
    readonly error?: Error;
}

/** ./logging. A destination. A plain object, not a class. IMPLEMENTED BY EXTENSIONS. */
export interface Sink {
    /** The name it is attached under. For a registered destination, MUST equal descriptor.id. */
    name: string;
    /** Synchronous, fire-and-forget. A throw is caught and reported; a returned promise is ignored. */
    write(record: LogRecord): void;
    /** Send anything buffered. */
    flush?(): Promise<void>;
    /** Narrows (never widens) the global level for this destination. */
    level?: LogLevel;
    /** Only records whose category contains one of these segments. */
    categories?: readonly string[];
    /** Release timers, sockets, queues. Called on removal and on replacement. */
    dispose?(): void | Promise<void>;
}

/** ./logging. Render a record as the element's console line. */
export declare function formatLogRecord(record: LogRecord): string;

/** The built-in destination ids. Reserved. */
export declare const KNOWN_LOG_SINK_IDS: readonly ["console", "remote"];
export type LogSinkId = (typeof KNOWN_LOG_SINK_IDS)[number] | (string & {});

/** One destination. IMPLEMENTED BY EXTENSIONS. */
export interface LogSinkDescriptor {
    id: LogSinkId;
    plainName: string;
    description: string;
    options: readonly OptionDescriptor[];
}

/** What registerLogSink accepts. IMPLEMENTED BY EXTENSIONS. */
export interface LogSinkRegistration {
    readonly descriptor: LogSinkDescriptor;
    /** Build the destination from options already validated and defaulted against descriptor.options. */
    readonly create: (options: Readonly<Record<string, unknown>>) => Sink;
}

/**
 * Register a destination FACTORY. Does NOT attach anything: records flow only once a
 * configuration names it. Throws GraphtyError E_BAD_COMMAND (details.field: descriptor, id,
 * create) or E_DUPLICATE_PLUGIN. Sameness is decided by the create function.
 */
export declare function registerLogSink(registration: LogSinkRegistration, options?: RegisterOptions): void;

export declare function registeredLogSinkDescriptors(): readonly LogSinkDescriptor[];
export declare function clearRegisteredLogSinksForTesting(): void;

/** ./logging. A destination named in a configuration. Plain JSON: survives storage and a settings panel. */
export interface LogSinkReference {
    readonly use: LogSinkId;
    readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * ./logging. The part of the logger configuration a destination is named in. NOT AN EXPORT: this
 * document's name for the `sinks` member of the configuration object `GraphtyLogger.configure`
 * takes.
 */
export interface GraphtyLoggerSinkConfig {
    /** Live objects are attached as given; references are built from the registry. */
    sinks?: readonly (Sink | LogSinkReference)[];
}

// =============================================================================================
// Proposed (NOT built) -- open decision "Whether a log destination declares where it sends data"
// (README.md section 12, item 13)
// =============================================================================================

/** PROPOSED addition to LogSinkDescriptor. */
export interface LogSinkEgress {
    /**
     * The origins ("https://logs.example.com") the destination may send records to; [] for a
     * destination that keeps records in the page. Absent means "not declared", which a settings
     * panel MUST show as unknown.
     */
    readonly destinations?: readonly string[];
    /** Whether the destination forwards LogRecord.data. Absent means "not declared". */
    readonly forwardsData?: boolean;
}

/**
 * PROPOSED -- open decision 13. An element-level setting: what the element strips from a record
 * before a non-built-in destination's write is called. Default "data-and-stacks".
 */
export type LogRedaction = "none" | "data" | "data-and-stacks";
