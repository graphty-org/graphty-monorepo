/**
 * The io contract types of @graphty/graph-io: what every importer
 * and exporter implements and what every caller of one programs against. They are declared here
 * rather than in the core because ImportInput and CommonImportOptions reference ReadableStream and
 * AbortSignal, which need the DOM lib (or @types/node >= 18); the core's public types reference only
 * ES2020 globals (decision D-IO-TYPES). Every declaration is transcribed verbatim from the design;
 * the behaviour behind each option is specified in sections 8.4 (import), 8.5 (export) and 8.6
 * (report and error aggregation).
 */

import {
    type Dtype,
    type DuplicatePolicy,
    GraphFormatError,
    type GraphSink,
    type GraphSnapshot,
    type IdCoercion,
} from "@graphty/graph-format";

/**
 * What an importer reads: whole text, whole bytes, a byte stream (a browser
 * `File.stream()`, a fetch body) or an async iterable of text or byte chunks. Bytes are decoded
 * strictly in the encoding the `encoding` option, a byte order mark or the file's own declaration
 * names, else as UTF-8 (undeclared bytes that are not UTF-8 are read as windows-1252 with a
 * warning), so an invalid sequence is a parse-error and never a silent U+FFFD that could alias two ids.
 */
export type ImportInput = string | Uint8Array | ReadableStream<Uint8Array> | AsyncIterable<string | Uint8Array>;

/**
 * The options every importer accepts next to its format-specific ones. The
 * builder-policy fields (`addMissingNodes`, `duplicateEdges`, `selfLoops`, `weightDtype`) seed the
 * registry's builder; on a caller's sink they are read back from `sink.options` and every option the
 * sink cannot honor is reported.
 */
export interface CommonImportOptions {
    /**
     * How id text becomes a node id. "canonical": integer text such as "42" becomes the number 42
     * and everything else ("042", "4.2", "a") stays text. "string": every id stays text. "number":
     * every id is read as a number, so "042" and "42" become one node (with a warning) and text that
     * is not a number is an error. "keep": ids keep the type the file gives them (JSON). The default
     * is "canonical" for text formats and "keep" for JSON.
     */
    ids?: IdCoercion | undefined;
    /**
     * Which field becomes the node id: "id" (the default), the node's "label", or its position in
     * the file ("index"). For GML, Pajek and d3 files whose ids are missing or meaningless.
     * @default "id"
     */
    nodeIdFrom?: "id" | "label" | "index" | undefined;
    /**
     * Whether an edge may name a node the file never declares; that node is then created. True by
     * default, except for GEXF edges.
     * @default true
     */
    addMissingNodes?: boolean | undefined;
    /**
     * What to do with a second edge between the same two nodes: "keep" (the default) keeps both,
     * "first" / "last" keep one, "sum" / "min" / "max" keep one with the weights combined, and
     * "error" skips it as an error.
     * @default "keep"
     */
    duplicateEdges?: DuplicatePolicy | undefined;
    /**
     * What to do with an edge from a node to itself: "keep" (the default), "drop", or "error" to skip
     * it as an error.
     * @default "keep"
     */
    selfLoops?: "keep" | "drop" | "error" | undefined;
    /**
     * What to do with a file that has both directed and undirected edges. "expand" (the default)
     * makes a directed graph in which each undirected edge is two edges, marked so an exporter can
     * write them back as one. "directed" / "undirected" read every edge that way. "error" stops the
     * import.
     * @default "expand"
     */
    onMixedDirection?: "expand" | "directed" | "undirected" | "error" | undefined;
    /**
     * Whether the graph is directed when the file does not say. Each format has its own default:
     * undirected for GEXF, GML and JSON, directed for DOT, CSV and Pajek.
     */
    defaultDirected?: boolean | undefined;
    /**
     * The edge attribute read as the edge weight: "weight" by default ("value" for GML). Pass null to
     * read every attribute as a plain attribute and leave the graph unweighted.
     */
    weightFrom?: string | null | undefined;
    /**
     * The precision weights are stored at while reading. "f64" (the default) keeps 0.1 and 16777217
     * exact; "f32" uses half the memory.
     * @default "f64"
     */
    weightDtype?: "f32" | "f64" | undefined;
    /**
     * How a column the file declares as a 64-bit integer is stored: "f64" (the default; exact up to
     * 2^53) or "string" (every digit kept, as text).
     * @default "f64"
     */
    long?: "f64" | "string" | undefined;
    /**
     * Whether to give back the original ids that an export with `sanitizeIds: "mangle"` had to
     * rewrite (the file keeps them in a `graphty:originalId` attribute).
     * @default true
     */
    restoreMangledIds?: boolean | undefined;
    /**
     * What to do with a GraphML or JGF hyperedge (an edge with more than two ends): "skip" (the
     * default) leaves it out with a warning, "error" stops the import, "star" adds a hub node joined
     * to every end, "clique" joins every pair of ends.
     * @default "skip"
     */
    hyperedges?: "error" | "skip" | "star" | "clique" | undefined;
    /**
     * How many errors an import tolerates. Each error skips one node, edge or value and is listed in
     * the report; one error more than this stops the import with an ImportError. Pass 0 to stop at
     * the first error.
     * @default 100
     */
    errorLimit?: number | undefined;
    /**
     * Cancels the import. When it aborts, the import stops and rejects with the signal's reason
     * (an AbortError, or a TimeoutError from `AbortSignal.timeout()`).
     */
    signal?: AbortSignal | undefined;
    /**
     * Called as the input is read, with the bytes read so far and the total when it is known (it is
     * known for a string or a Uint8Array, not for a stream). Text counts its UTF-8 length. The last
     * call has `bytesDone === bytesTotal`.
     */
    onProgress?: ((bytesDone: number, bytesTotal?: number) => void) | undefined;
    /**
     * The character encoding of byte input, as a label such as "utf-8", "windows-1252" or
     * "utf-16le". Without it graph-io uses a byte order mark, then the encoding the file declares
     * (an XML declaration, DOT's `charset`), then UTF-8, and reads bytes that are not UTF-8 as
     * windows-1252 with a warning. A byte order mark wins over this option. Has no effect on a
     * string input.
     */
    encoding?: string | undefined;
}

/**
 * Which graph of an input that holds several to read: by position or by name, never both. An
 * importer of a format that can hold several graphs (a Cytoscape session, a CX collection, a JGF
 * or OBO Graphs `graphs` array) accepts these next to its own options; absent, it reads the first.
 */
export interface GraphChoiceOptions {
    /** The 0-based position of the graph, as `GraphListing.index` gives it. */
    graphIndex?: number | undefined;
    /** The name of the graph, as `GraphListing.name` gives it; a name two graphs share is refused. */
    graphName?: string | undefined;
}

/** One graph of an input that can hold several, as an importer's listGraphs() describes it. */
export interface GraphListing {
    /** The value graphIndex takes to read it. */
    readonly index: number;
    /** The value graphName takes to read it, or null when the graph has no name. */
    readonly name: string | null;
    /** The node count when the input states it cheaply, else null. */
    readonly nodes: number | null;
    /** The edge count when the input states it cheaply, else null. */
    readonly edges: number | null;
}

/**
 * An importer plugin: pushes scalars into the caller's sink in one pass and
 * never freezes. `Opts` is its format-specific option set; the default `unknown` lets a caller pass
 * the common options to an importer typed without one.
 */
export interface GraphImporter<Opts = unknown> {
    /** The format name: "gexf", "graphml", "gml", "dot", "pajek", "csv", "json", "neo4j". */
    readonly format: string;
    /** File extensions with the leading dot. */
    readonly extensions: readonly string[];
    /** MIME types the format is served as. */
    readonly mimeTypes: readonly string[];
    /**
     * Confidence that `head` is this format, for the registry's sniff().
     * @param head - the first bytes of the input
     * @returns a confidence in 0..1
     */
    sniff?(head: Uint8Array): number;
    /**
     * Read `input` into `sink`; per-element errors are aggregated into the report until the error
     * limit, then the importer throws ImportError with the partial report.
     * @param input - the text, bytes or stream to read
     * @param sink - the builder (or a recording sink) to push into
     * @param options - format-specific and common options
     * @returns the import report
     */
    import(input: ImportInput, sink: GraphSink, options?: Opts & CommonImportOptions): Promise<ImportReport>;
    /**
     * Read every graph of an input that can hold several (a DOT file with several graphs, a
     * Pajek project with several networks, a JGF `graphs` array), each into its own sink. An
     * importer without this method reads one graph per input. `import()` reads the first graph
     * and warns how many it skipped.
     * @param input - the text, bytes or stream to read
     * @param sinkFor - called once per graph, in document order, before that graph's first push
     * @param options - format-specific and common options
     * @returns one report per graph, in document order
     */
    importAll?(
        input: ImportInput,
        sinkFor: (index: number) => GraphSink,
        options?: Opts & CommonImportOptions,
    ): Promise<ImportReport[]>;
    /**
     * List the graphs of an input that can hold several without importing them, so a caller can
     * offer a choice before reading one with `graphIndex` or `graphName`. An importer without this
     * method does not list its graphs; `import()` reads the first.
     * @param input - the text, bytes or stream to read
     * @param options - format-specific and common options
     * @returns one listing per graph, in document order
     */
    listGraphs?(input: ImportInput, options?: Opts & CommonImportOptions): Promise<readonly GraphListing[]>;
}

/**
 * What a format can express without loss: the format's fidelity matrix, and the list of things
 * check() tests a snapshot against.
 */
export interface ExportCapabilities {
    /** Directed and undirected edges in one file. */
    readonly mixedDirection: boolean;
    /** Parallel edges. */
    readonly multiEdges: boolean;
    /** Self-loops. */
    readonly selfLoops: boolean;
    /** Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored). */
    readonly edgeIds: "required" | "optional" | "none";
    /** Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N). */
    readonly idCharset: "any" | "nmtoken" | "integer" | "dense-1-based";
    /** The column types the format keeps exactly. */
    readonly dtypes: readonly Dtype[];
    /** Columns with several numbers per row, such as a position. */
    readonly components: boolean;
    /** List columns. */
    readonly lists: boolean;
    /** Nested JSON values. */
    readonly json: boolean;
    /** Columns' declared default values. */
    readonly defaults: boolean;
    /** Declared lists of allowed values (GEXF options). */
    readonly options: boolean;
    /** Nesting: nodes inside other nodes (parent columns). */
    readonly hierarchy: boolean;
    /** Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). */
    readonly temporal: "none" | "intervals" | "spells" | "dynamic-values";
    /** Graph-level attributes. */
    readonly graphAttributes: boolean;
    /** Node positions. */
    readonly positions: boolean;
    /** Visual columns: color, size, shape and thickness. */
    readonly viz: boolean;
}

/** One thing an exporter cannot represent, reported by check() before anything is written. */
export interface LossNote {
    /**
     * A stable code. Codes starting with "E_" mean the export refuses to write under these options:
     * the exportGraph*() functions throw a GraphFormatError. Codes starting with "W_" mean the file
     * is written, but this part will not read back the same.
     */
    readonly code: string;
    /** A plain-English explanation. */
    readonly message: string;
    /** The attribute column involved, or null. */
    readonly column: string | null;
    /** How many nodes, edges or values are affected, or null when not counted. */
    readonly count: number | null;
}

/** The options every exporter accepts next to its format-specific ones. */
export interface CommonExportOptions {
    /**
     * What to do with node ids the format cannot hold. "error" (the default): the export throws and
     * no node is renamed. "mangle": such ids are rewritten and the originals are kept in the file, so
     * graph-io reads the original ids back.
     * @default "error"
     */
    sanitizeIds?: "error" | "mangle" | undefined;
    /**
     * What a format with one direction per file does with a graph that has both directed and
     * undirected edges: "error" (the default) throws, "directed" writes every edge as directed (an
     * undirected edge once, as one directed edge), "undirected" writes the whole graph undirected.
     * @default "error"
     */
    onMixedDirection?: "error" | "directed" | "undirected" | undefined;
}

/**
 * An exporter plugin: iterates nodes and logical edges (never arcs) in index
 * order and reads the role columns of section 3.6 / 3.7 to fold expanded pairs and emit explicit
 * weights only.
 */
export interface GraphExporter<Opts = unknown> {
    /** The format name. */
    readonly format: string;
    /** What the format can express. */
    readonly capabilities: ExportCapabilities;
    /**
     * File extensions with the leading dot, most common first. Optional; listFormats() uses them
     * when no importer is registered for the format (an export-only format).
     */
    readonly extensions?: readonly string[] | undefined;
    /** MIME types, most specific first. Optional; used the same way as `extensions`. */
    readonly mimeTypes?: readonly string[] | undefined;
    /**
     * Pre-flight: what export() would lose, without writing anything.
     * @param snapshot - the snapshot to check
     * @param options - format-specific and common options
     * @returns the loss notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): readonly LossNote[];
    /**
     * Write the snapshot as byte chunks: UTF-8 text for a text format, the archive for a binary
     * one (a Cytoscape session).
     * @param snapshot - the snapshot to write
     * @param options - format-specific and common options
     * @returns the encoded chunks
     */
    export(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): AsyncIterable<Uint8Array>;
    /**
     * Write the snapshot as one string. A binary format (a Cytoscape session) rejects with
     * E_UNSUPPORTED (`details.reason` "binary"): use export().
     * @param snapshot - the snapshot to write
     * @param options - format-specific and common options
     * @returns the whole document
     */
    exportToString(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): Promise<string>;
}

/** The categories of an ImportIssue. */
export type IssueCategory =
    | "parse-error"
    | "missing-value"
    | "validation-error"
    | "unsupported"
    | "precision"
    | "coercion"
    | "merged";

/** One problem found while importing. */
export interface ImportIssue {
    /** The category. */
    readonly category: IssueCategory;
    /**
     * "error": the element was skipped and counts toward `errorLimit`. "warning": the element was
     * kept, possibly changed.
     */
    readonly severity: "error" | "warning";
    /** A stable code; E_ for errors, W_ for warnings ("E_UNKNOWN_NODE", "W_WIDENED"). */
    readonly code: string;
    /** A plain-English message. */
    readonly message: string;
    /** The 1-based line in the input, or null when the format has no lines or it is unknown. */
    readonly line: number | null;
    /** The node id, edge id or attribute name involved, or null. */
    readonly element: string | null;
}

/** What an import produced besides the sink's contents. */
export interface ImportReport {
    /** The importer's format name. */
    readonly format: string;
    /** Element counts. */
    readonly counts: {
        /** Nodes pushed. */
        readonly nodes: number;
        /** Logical edges pushed (both halves of an expanded edge count). */
        readonly edges: number;
        /** Nodes skipped after an error. */
        readonly skippedNodes: number;
        /** Edges skipped after an error. */
        readonly skippedEdges: number;
        /** Edges expanded under onMixedDirection "expand". */
        readonly expandedMixed: number;
    };
    /** Every issue recorded, in order. */
    readonly issues: readonly ImportIssue[];
    /** Issues with severity "error". */
    readonly errorCount: number;
    /** Issues with severity "warning". */
    readonly warningCount: number;
    /** Whether the error limit was reached and the import aborted. */
    readonly truncated: boolean;
    /** What the importer could not represent. */
    readonly lossy: readonly LossNote[];
    /** Wall time of the parse phase; the caller's freeze reports separately. */
    readonly durationMs: number;
}

/**
 * The error an importer throws when the error limit is reached or the input cannot be read at all:
 * a GraphFormatError with code "E_IMPORT" (reserved in the core's union so
 * `err.code === "E_IMPORT"` narrows) carrying the partial report.
 */
export class ImportError extends GraphFormatError {
    /** Everything recorded up to the point the import stopped. */
    readonly report: ImportReport;

    /**
     * The issue that stopped the import: its `code` ("E_FETCH", "E_UNKNOWN_FORMAT", "E_PARSE", ...),
     * `message`, `line` and `element`. This is the value to branch on; `code` is always "E_IMPORT".
     * Null only for an ImportError constructed by hand without a matching issue.
     * @example
     * ```ts
     * if (err instanceof ImportError) {
     *     switch (err.issue?.code) {
     *         case "E_FETCH":
     *             console.error(`download failed with status ${String(err.details.status)}`);
     *             break;
     *         case "E_UNKNOWN_FORMAT":
     *             console.error("not a graph file this library can read; pass `format`");
     *             break;
     *         default:
     *             console.error(err.message);
     *     }
     * }
     * ```
     */
    readonly issue: ImportIssue | null;

    /**
     * Create an ImportError.
     * @param message - a plain-ASCII human-readable message
     * @param report - the partial report
     * @param details - optional machine-readable context; its `code` names the issue that stopped the import
     */
    constructor(message: string, report: ImportReport, details?: Readonly<Record<string, unknown>>) {
        super("E_IMPORT", message, details);
        this.name = "ImportError";
        this.report = report;
        this.issue = stoppingIssue(report.issues, details?.code);
    }
}

/**
 * The issue that stopped an import: the last one with the code the abort named, else the last error.
 * @param issues - the report's issues
 * @param code - the code the abort named, if any
 * @returns the issue, or null
 */
function stoppingIssue(issues: readonly ImportIssue[], code: unknown): ImportIssue | null {
    let lastError: ImportIssue | null = null;
    for (let i = issues.length - 1; i >= 0; i--) {
        if (issues[i].code === code) {
            return issues[i];
        }
        if (lastError === null && issues[i].severity === "error") {
            lastError = issues[i];
        }
    }
    return lastError;
}
