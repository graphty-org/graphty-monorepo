/**
 * The io contract types of @graphty/graph-io: what every importer
 * and exporter implements and what every caller of one programs against. They are declared here
 * rather than in the core because ImportInput and CommonImportOptions reference ReadableStream and
 * AbortSignal, which need the DOM lib (or @types/node >= 18); the core's public types reference only
 * ES2020 globals (decision D-IO-TYPES). Every declaration is transcribed verbatim from the design;
 * the behavior behind each option is specified in sections 8.4 (import), 8.5 (export) and 8.6
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
 * @category Loading
 */
export type ImportInput = string | Uint8Array | ReadableStream<Uint8Array> | AsyncIterable<string | Uint8Array>;

/**
 * The options every importer accepts next to its format-specific ones. The
 * builder-policy fields (`addMissingNodes`, `duplicateEdges`, `selfLoops`, `weightDtype`) seed the
 * registry's builder; on a caller's sink they are read back from `sink.options` and every option the
 * sink cannot honor is reported.
 * @category Loading
 */
export interface CommonImportOptions {
    /**
     * How id text becomes a node id. "canonical": integer text such as "42" becomes the number 42
     * and everything else ("042", "4.2", "a") stays text. "string": every id stays text. "number":
     * every id is read as a number, so "042" and "42" become one node (with a warning) and text that
     * is not a number is an error. "keep": ids keep the type the file gives them. The default is
     * "keep" for JSON, OBO, XGMML, CX, CX2 and Cytoscape sessions, and "canonical" for the other
     * formats.
     * @defaultValue per format
     */
    ids?: IdCoercion | undefined;
    /**
     * Which field becomes the node id: "id", the node's "label", or its position in the file
     * ("index"). Useful for GML, Pajek and d3 files whose ids are missing or meaningless. Under
     * "index", edges must name their ends by that position, as numbers. CSV reads this option only
     * when there is a node table.
     * @defaultValue "id"
     */
    nodeIdFrom?: "id" | "label" | "index" | undefined;
    /**
     * Whether an edge may name a node the file never declares; that node is then created. When
     * false, such an edge is skipped as an error. The default is false for GEXF, XGMML, CX, CX2 and
     * Cytoscape sessions, whose files must declare every node, and true for the other formats.
     * @defaultValue per format
     */
    addMissingNodes?: boolean | undefined;
    /**
     * What to do with a second edge between the same two nodes: "keep" keeps both, "first" / "last"
     * keep one, "sum" / "min" / "max" keep one with the weights combined, and "error" stops the
     * import. Merged edges are reported once as W_EDGES_MERGED.
     * @defaultValue "keep"
     */
    duplicateEdges?: DuplicatePolicy | undefined;
    /**
     * What to do with an edge from a node to itself: "keep", "drop" (reported once as
     * W_SELF_LOOPS_DROPPED with the number removed), or "error" to stop the import.
     * @defaultValue "keep"
     */
    selfLoops?: "keep" | "drop" | "error" | undefined;
    /**
     * What to do with a file that has both directed and undirected edges. "expand" makes a directed
     * graph in which each undirected edge is two edges, marked so an export can write them back as
     * one. "directed" / "undirected" read every edge that way. "error" stops the import.
     * @defaultValue "expand"
     */
    onMixedDirection?: "expand" | "directed" | "undirected" | "error" | undefined;
    /**
     * Whether the graph is directed when the file does not say. The default is undirected for
     * GraphML, GEXF, GML, JSON and XGMML, and directed for DOT, CSV, Pajek, Neo4j, CX, CX2, OBO and
     * Cytoscape sessions.
     * @defaultValue per format
     */
    defaultDirected?: boolean | undefined;
    /**
     * The edge attribute read as the edge weight. The default is "weight", except "value" for GML
     * and Pajek and none for OBO. Pass null to read every attribute as a plain attribute and leave
     * the graph unweighted.
     * @defaultValue per format
     */
    weightFrom?: string | null | undefined;
    /**
     * The precision of the exact weight column (`snapshot.edges.byRole("weight")`). "f64" keeps 0.1
     * and 16777217 exact; "f32" uses half the memory. The weight array `snapshot.weights` is always
     * 32-bit.
     * @defaultValue "f64"
     */
    weightDtype?: "f32" | "f64" | undefined;
    /**
     * How a column the file declares as a 64-bit integer is stored: "f64" (a number, exact up to
     * 2^53) or "string" (every digit kept, as text).
     * @defaultValue "f64"
     */
    long?: "f64" | "string" | undefined;
    /**
     * Whether to give back the original ids that an export with `sanitizeIds: "mangle"` had to
     * rewrite. The export writes them to the file in an attribute whose name each format page
     * gives.
     * @defaultValue true
     */
    restoreMangledIds?: boolean | undefined;
    /**
     * What to do with a GraphML or JGF hyperedge (an edge with more than two ends): "skip" leaves it
     * out with a warning, "error" stops the import, "star" adds a hub node joined to every end, and
     * "clique" joins every pair of ends. "star" and "clique" keep everything, so they add no warning.
     * @defaultValue "skip"
     */
    hyperedges?: "error" | "skip" | "star" | "clique" | undefined;
    /**
     * How many errors an import tolerates. Each error skips one node, edge or value and is listed in
     * the report; one error more than this stops the import with an ImportError. Pass 0 to stop at
     * the first error.
     * @defaultValue 100
     */
    errorLimit?: number | undefined;
    /**
     * Cancels the import. When it aborts, the import stops and rejects with the signal's reason
     * (an AbortError, or a TimeoutError from `AbortSignal.timeout()`).
     */
    signal?: AbortSignal | undefined;
    /**
     * Called as the input is read, with the bytes read so far and the total. For a string or a
     * Uint8Array the total is known from the first call. For a stream (which includes loadFromUrl()
     * and loadFromFile()) it is undefined until the last call, which always has
     * `bytesDone === bytesTotal`. Text counts its UTF-8 length.
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
 * Which graph to read from a file that holds several: by position or by name, never both. Without
 * either, the first graph is read.
 * @category Loading
 */
export interface GraphChoiceOptions {
    /**
     * The 0-based position of the graph to read from a file that holds several (`listGraphs()`
     * gives each graph's `index`). A position past the last graph fails with E_GRAPH_NOT_FOUND.
     * @defaultValue 0
     */
    graphIndex?: number | undefined;
    /**
     * The name of the graph to read from a file that holds several (`listGraphs()` gives each
     * graph's `name`). A name no graph has fails with E_GRAPH_NOT_FOUND, and a name two graphs
     * share with E_AMBIGUOUS_GRAPH_NAME.
     */
    graphName?: string | undefined;
}

/**
 * One graph of an input that can hold several, as an importer's listGraphs() describes it.
 * @category Loading
 */
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
 * A format's reader. It reads the input once, from start to end, and adds each node, edge and
 * attribute to a graph builder (`GraphSink`, which `GraphBuilder` from @graphty/graph-format
 * implements); importGraph() then builds the snapshot. Register one with
 * `registry.registerImporter()` to teach graph-io a new format. `Opts` is the type of the format's
 * own options.
 * @category Plugin helpers
 */
export interface GraphImporter<Opts = unknown> {
    /** The name callers pass as `format`, such as "graphml" or "csv"; lowercase, unique in a registry. */
    readonly format: string;
    /** File extensions with the leading dot, most common first; used to detect the format from a file name. */
    readonly extensions: readonly string[];
    /** MIME types the format is served as, most specific first; used to detect the format from a Content-Type. */
    readonly mimeTypes: readonly string[];
    /**
     * How sure you are that `head`, the first bytes of a file (up to SNIFF_HEAD_BYTES), is this
     * format: 0 for no, up to 1 for certain. Below 0.5 counts as a weak guess, which loses to a
     * file extension another format claims. Without this method the format is detected only by
     * file name and MIME type.
     * @param head - the first bytes of the input
     * @returns a confidence in 0..1
     */
    sniff?(head: Uint8Array): number;
    /**
     * Read `input` into `sink`. Record each problem in an ImportReportBuilder and skip the element;
     * the builder throws ImportError once there are more errors than `errorLimit`.
     * @param input - the text, bytes or stream to read
     * @param sink - the graph builder to add nodes, edges and attributes to
     * @param options - the format's own options and the options every importer takes
     * @returns the import report (`report.finish()`)
     */
    import(input: ImportInput, sink: GraphSink, options?: Opts & CommonImportOptions): Promise<ImportReport>;
    /**
     * Optional, for a format whose files can hold several graphs: read every graph, each into its
     * own sink. importAllGraphs() calls it; with it, importGraph() also honors `graphIndex` and
     * `graphName` by reading every graph and returning the chosen one. `import()` should read the
     * first graph and warn W_MULTIPLE_GRAPHS with the number skipped.
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
     * Optional: list the graphs of a file without importing them, so a caller can offer a choice.
     * listGraphs() calls it. An importer that has it must also honor `graphIndex` and `graphName`
     * in `import()` itself (`chooseGraph()` resolves them); one without it lists nothing and the
     * registry makes the choice through `importAll()`.
     * @param input - the text, bytes or stream to read
     * @param options - format-specific and common options
     * @returns one listing per graph, in document order
     */
    listGraphs?(input: ImportInput, options?: Opts & CommonImportOptions): Promise<readonly GraphListing[]>;
}

/**
 * What a format can store exactly. checkCapabilities() compares a graph against it and returns a
 * loss note for everything the graph has that the format cannot store.
 * @category Saving
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
    /**
     * The attribute types the format keeps exactly: "bool", "i32" (32-bit integer), "u32" (unsigned
     * 32-bit integer), "u8" (byte), "f32" (32-bit float), "f64" (64-bit float, a JavaScript number),
     * "string" (text), "dict" (text stored as a dictionary of repeated values), "list" and "json".
     * An attribute of another type is written as the nearest one the format has, with a
     * W_DTYPE_UNSUPPORTED note.
     */
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

/**
 * One thing a format cannot store, returned by checkExport() before anything is written.
 * @category Saving
 */
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

/**
 * The options every exporter accepts next to its format-specific ones.
 * @category Saving
 */
export interface CommonExportOptions {
    /**
     * What to do with node ids the format cannot hold. "error": the export throws (E_INVALID_ID) and
     * no node is renamed. "mangle": such ids are rewritten and the originals are written to the
     * file too, so an import with `restoreMangledIds` (on by default) reads the original ids back.
     * Pajek is the exception: it always numbers nodes 1 to N and keeps the old ids as labels.
     * @defaultValue "error"
     */
    sanitizeIds?: "error" | "mangle" | undefined;
    /**
     * What a format with one direction per file does with a graph that has both directed and
     * undirected edges: "error" throws (E_DIRECTED), "directed" writes every edge as directed (an
     * undirected edge once, as one directed edge), "undirected" writes the whole graph undirected.
     * @defaultValue "error"
     */
    onMixedDirection?: "error" | "directed" | "undirected" | undefined;
}

/**
 * A format's writer. Register one with `registry.registerExporter()` to make a format writable by
 * every save function. `Opts` is the type of the format's own options.
 * @category Plugin helpers
 */
export interface GraphExporter<Opts = unknown> {
    /** The name callers pass as `format`; the same as the importer's when the format has both. */
    readonly format: string;
    /** What the format can store exactly; build it with `capabilities()`. */
    readonly capabilities: ExportCapabilities;
    /**
     * File extensions with the leading dot, most common first. Optional; listFormats() uses them
     * when no importer is registered for the format (an export-only format).
     */
    readonly extensions?: readonly string[] | undefined;
    /** MIME types, most specific first. Optional; used the same way as `extensions`. */
    readonly mimeTypes?: readonly string[] | undefined;
    /**
     * What a save would lose, without writing anything; checkExport(snapshot, format, options) calls
     * it. Start from `checkCapabilities(snapshot, capabilities, resolveExportOptions(options))` and
     * add a note for anything else your format changes. Every difference a re-import would show
     * needs a note.
     * @param snapshot - the graph to check
     * @param options - the format's own options and the options every exporter takes
     * @returns the loss notes, empty when the save is exact
     */
    check(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): readonly LossNote[];
    /**
     * Write the graph as byte chunks: UTF-8 text for a text format (`encodeChunks()` turns string
     * parts into them), the raw bytes for a binary one. Throw a GraphFormatError before writing for
     * every "E_" note `check()` returns.
     * @param snapshot - the graph to write
     * @param options - the format's own options and the options every exporter takes
     * @returns the file's bytes, chunk by chunk
     */
    export(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): AsyncIterable<Uint8Array>;
    /**
     * Write the graph as one string (`joinText()` joins string parts). A binary format rejects with
     * a GraphFormatError E_UNSUPPORTED (`details.reason` "binary") instead.
     * @param snapshot - the graph to write
     * @param options - the format's own options and the options every exporter takes
     * @returns the whole file
     */
    exportToString(snapshot: GraphSnapshot, options?: Opts & CommonExportOptions): Promise<string>;
}

/**
 * What kind of problem an ImportIssue is: "parse-error" (the text is not valid in the format),
 * "missing-value" (something required is absent), "validation-error" (a value is not allowed, or a
 * policy option refused it), "unsupported" (the file uses something graph-io does not read),
 * "precision" (a value was rounded), "coercion" (a value or id changed type) and "merged" (elements
 * were combined).
 * @category Reports and errors
 */
export type IssueCategory =
    | "parse-error"
    | "missing-value"
    | "validation-error"
    | "unsupported"
    | "precision"
    | "coercion"
    | "merged";

/**
 * One problem found while importing.
 * @category Reports and errors
 */
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

/**
 * What happened while a file was read.
 * @category Reports and errors
 */
export interface ImportReport {
    /** The format the file was read as. */
    readonly format: string;
    /**
     * What was read from the file, counted before the graph was built: `duplicateEdges` and
     * `selfLoops: "drop"` can leave fewer edges in the snapshot (each reported as a warning).
     */
    readonly counts: {
        /** Nodes read. */
        readonly nodes: number;
        /** Edges read (an undirected edge expanded into two by onMixedDirection "expand" counts twice). */
        readonly edges: number;
        /** Nodes skipped after an error. */
        readonly skippedNodes: number;
        /** Edges skipped after an error. */
        readonly skippedEdges: number;
        /** Undirected edges expanded into two by onMixedDirection "expand". */
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
    /** How long reading the file took, in milliseconds. */
    readonly durationMs: number;
}

/**
 * What a load function throws when the input cannot be read: the URL failed, the format was not
 * recognized, the file could not be parsed, or there were more errors than `errorLimit`. It is a
 * GraphFormatError with code "E_IMPORT"; `issue` says what stopped the import and `report` holds
 * everything recorded until then.
 * @category Reports and errors
 */
export class ImportError extends GraphFormatError {
    /** Everything recorded up to the point the import stopped. */
    readonly report: ImportReport;

    /**
     * The issue that stopped the import: its `code` ("E_FETCH", "E_UNKNOWN_FORMAT", "E_GML_SYNTAX", ...),
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
