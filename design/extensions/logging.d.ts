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
    /**
     * The name it is attached under. For a live object added with addSink, this is the key. For a
     * registered destination the element attaches it under descriptor.id and ignores this value
     * (logging.md section 3 item 4; not yet met in 2.6.1, which keys by this name).
     */
    name: string;
    /**
     * Must not block. A throw is caught and reported. PROPOSED (logging.md section 4 item 1): a
     * returned promise is queued, ordered, retried and flushed by the element; 2.6.1 ignores it.
     */
    write(record: LogRecord): void | Promise<unknown>;
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
 * ./logging. What GraphtyLogger.configure takes. Restated IN PART: only the members this
 * specification governs. As built it extends Partial<LoggerConfig> (level, modules and the other
 * logger settings), which are not restated here.
 */
export interface GraphtyLoggerConfig {
    /** URL of the built-in remote destination. Never from a stored or URL-derived configuration without the embedder's allowlist (logging.md 7 item 4). */
    remoteLogUrl?: string;
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
     * destination that says it keeps records in the page. Absent means "not declared", which a
     * settings panel MUST show as unknown and the element treats as EGRESS. Either way it is the
     * author's claim: only the embedder, in code, can mark a destination as in-page.
     */
    readonly destinations?: readonly string[];
    /** Whether the destination forwards LogRecord.data. Absent means "not declared". */
    readonly forwardsData?: boolean;
}

/**
 * PROPOSED -- open decision 13. An element-level setting, settable from code only: what the
 * element strips from a record before the write of EVERY destination -- console and live addSink
 * objects included -- except those the embedder marked as in-page in code. "data-and-stacks" (the default) strips data, error.stack,
 * error.cause and GraphtyError.details; "none" delivers the record whole. Message text carries no
 * graph values by the rule of logging.md section 7 item 2.
 */
export type LogRedaction = "none" | "data" | "data-and-stacks";
