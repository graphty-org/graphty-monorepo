/**
 * File format extension point. NORMATIVE for shapes; behaviour in design/extensions/file-format.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form of the descriptor:
 * design/extensions/descriptors.schema.json#/$defs/FormatDescriptor.
 */
import type { GraphtyError, OptionDescriptor, RegisterOptions } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1): the READER
// =============================================================================================

/** The built-in format ids. Reserved. "sif" and "cx2" are deprecated and unserved. */
export declare const KNOWN_FORMAT_IDS: readonly ["json", "csv", "graphml", "gexf", "gml", "dot", "pajek", "sif", "cx2"];

/** A format id: a built-in name or a registered one. OPEN UNION. */
export type FormatId = (typeof KNOWN_FORMAT_IDS)[number] | (string & {});

/** One format. IMPLEMENTED BY EXTENSIONS. */
export interface FormatDescriptor {
    /** Permanent id; MUST equal the reader class's static type. */
    id: FormatId;
    plainName: string;
    /** At least one; each lower-case and beginning with ".". Compared against a file name. */
    extensions: readonly string[];
    /** At least one media type. What a file picker filters on. */
    mimeTypes: readonly string[];
    /** true for a registered reader. */
    canImport: boolean;
    /** MUST be false in 2.6.1 (there is no writer seam); see the Proposed section. */
    canExport: boolean;
    /** The reader's options. The same array validates what a host passes. */
    options: readonly OptionDescriptor[];
}

/** A record as a reader yields it: a plain object branded so the element accepts it. */
export type AdHocData = Record<string, unknown> & { readonly __brand: "AdHocData" };

/** One batch of records. Node records carry "id"; edge records carry "source" and "target". */
export interface DataSourceChunk {
    nodes: AdHocData[];
    edges: AdHocData[];
}

/** What every reader accepts, beside its declared options. Exactly one of data, file, url. */
export interface BaseDataSourceConfig {
    data?: string;
    file?: File;
    url?: string;
    chunkSize?: number;
    errorLimit?: number;
}

/** What the file itself said about edge direction. CALLED BY EXTENSIONS (via declareDirection). */
export interface DeclaredDirection {
    readonly directed: boolean;
    /** The text in the file that said so, spelled as the file spells it. */
    readonly statedBy: string;
    /** Edges whose own direction disagreed with `directed` and were overridden. */
    readonly conflictingEdges: number;
}

/** Per-record errors a reader collects instead of aborting. CALLED BY EXTENSIONS. */
export interface DataLoadingError {
    message: string;
    line?: number;
    category?: string;
    field?: string;
}

export declare class ErrorAggregator {
    constructor(maxErrors?: number);
    /** Record one error. Returns false (and records nothing) once the limit is reached; the reader MUST then stop. */
    addError(error: DataLoadingError): boolean;
    getErrorCount(): number;
    hasReachedLimit(): boolean;
    getErrors(): DataLoadingError[];
}

/**
 * The reader base class. A third-party reader EXTENDS it.
 * Statics and abstract members: IMPLEMENTED BY EXTENSIONS. Protected helpers: CALLED BY EXTENSIONS.
 */
export declare abstract class DataSource {
    /** The id; MUST equal descriptor.id. */
    static readonly type: string;
    static readonly DEFAULT_CHUNK_SIZE: 1000;
    /** REQUIRED of a third-party reader; registration refuses a class without one. */
    static descriptor?: FormatDescriptor;
    /**
     * Content sniffer. OPTIONAL. Receives the first few kilobytes as text, trimmed. MUST be pure,
     * synchronous and fast (it runs on every detection). A throw is read as false.
     */
    static detect?: (sample: string) => boolean;

    constructor(errorLimit?: number, chunkSize?: number);

    /** Yield the file's records. Throw a GraphtyError (E_PARSE_FAILED, E_FETCH_FAILED) to fail the load. */
    abstract sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown>;
    /** Return the config the instance was constructed with. */
    protected abstract getConfig(): BaseDataSourceConfig;

    /** Read the input from data, file or url; retries a URL three times with backoff; E_FETCH_FAILED on failure. */
    protected getContent(): Promise<string>;
    /** Validate and default the host's options against descriptor.options. E_UNKNOWN_OPTION, E_OPTION_RANGE. */
    protected resolveOptions(passed: object): Record<string, unknown>;
    /** Split records into chunks of chunkSize. */
    protected chunkData(nodes: AdHocData[], edges: AdHocData[]): Generator<DataSourceChunk, void, unknown>;
    /** State what the file says about direction. Call before the first chunk, at most once. */
    protected declareDirection(directed: boolean, statedBy: string, conflictingEdges?: number): void;
    protected errorAggregator: ErrorAggregator;

    /** Build one record from plain fields. */
    static toRecord(fields: Readonly<Record<string, unknown>>): AdHocData;
    static toRecords(records: readonly Readonly<Record<string, unknown>>[]): AdHocData[];

    /**
     * Register a reader class. Returns the class. Throws GraphtyError E_BAD_COMMAND (details.field
     * names the static or descriptor member) or E_DUPLICATE_PLUGIN.
     */
    static register<T extends abstract new (...args: never[]) => DataSource>(cls: T, options?: RegisterOptions): T;
}

/** What a detector is given. */
export interface DetectionInput {
    readonly filename?: string;
    readonly sample?: string;
}

/** Every format that claims the input: built-ins first, then registered readers in registration order. */
export declare function detectFormats(input: DetectionInput): readonly FormatId[];
export declare function detectFormat(input: DetectionInput): FormatId | null;

export declare function registeredFormatDescriptors(): readonly FormatDescriptor[];
export declare function clearRegisteredFormatsForTesting(): void;

// =============================================================================================
// Proposed (NOT built): the WRITER. Depends on README.md section 12, open decision 1.
// The shapes below are the recommended option (A): an element-owned registration wrapping a
// graph-io exporter. Option (B) would have no element types at all; option (C) would add a
// static writer to DataSource instead.
// =============================================================================================

/** graph-io's exporter contract (graph-io/src/types.ts), restated here for reference only. */
export interface GraphExporterLike<Snapshot = unknown, Opts = unknown> {
    readonly format: string;
    readonly capabilities: ExportCapabilitiesLike;
    check(snapshot: Snapshot, options?: Opts): readonly LossNote[];
    export(snapshot: Snapshot, options?: Opts): AsyncIterable<Uint8Array>;
    exportToString(snapshot: Snapshot, options?: Opts): Promise<string>;
}

/** graph-io's ExportCapabilities: what the format can represent without loss. */
export interface ExportCapabilitiesLike {
    readonly mixedDirection: boolean;
    readonly multiEdges: boolean;
    readonly selfLoops: boolean;
    readonly edgeIds: "required" | "optional" | "none";
    readonly idCharset: "any" | "nmtoken" | "integer" | "dense-1-based";
    readonly dtypes: readonly string[];
    readonly components: boolean;
    readonly lists: boolean;
    readonly json: boolean;
    readonly defaults: boolean;
    readonly options: boolean;
    readonly hierarchy: boolean;
    readonly temporal: "none" | "intervals" | "spells" | "dynamic-values";
    readonly graphAttributes: boolean;
    readonly positions: boolean;
    /** Whether the format has a place for colour, size, shape and thickness. */
    readonly viz: boolean;
}

/** One thing an export could not carry. */
export interface LossNote {
    /** Stable code, for example "W_OPEN_INTERVAL". */
    readonly code: string;
    readonly message: string;
    readonly column: string | null;
    readonly count: number | null;
}

/** PROPOSED. What registerFormatWriter accepts. IMPLEMENTED BY EXTENSIONS. */
export interface FormatWriterRegistration<Snapshot = unknown> {
    /**
     * The format's descriptor with canExport: true. When a reader for the same id is registered,
     * the two descriptors MUST agree on id, plainName, extensions and mimeTypes; the catalogue
     * publishes one entry with canImport and canExport both true.
     */
    readonly descriptor: FormatDescriptor;
    /** The writer's options, validated like every other option set. */
    readonly writerOptions?: readonly OptionDescriptor[];
    /** The graph-io exporter that does the writing. */
    readonly exporter: GraphExporterLike<Snapshot>;
}

/** PROPOSED. Register a writer. Same policy as every registry (README section 4.2). */
export declare function registerFormatWriter(registration: FormatWriterRegistration, options?: RegisterOptions): void;

/** PROPOSED. What the element's export method returns. Name and signature: migration plan section 6 item 2. */
export interface ExportResult {
    readonly text: string;
    /** Everything the format could not carry. Empty only when the export is exact. */
    readonly lossNotes: readonly LossNote[];
}

/** PROPOSED. How a writer failure reaches the consumer. */
export type WriterFailure = GraphtyError;
