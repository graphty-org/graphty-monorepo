import type { GraphSnapshot } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphListing,
    type ImportReport,
    ImportReportBuilder,
    readText,
} from "@graphty/graph-io";
import { z } from "zod/v4";
import * as z4 from "zod/v4/core";

import { MIN_CONTENT_CONFIDENCE } from "../catalog/detect";
import { type GraphLister, publishFormatDescriptor } from "../catalog/formatRegistry";
import { FORMAT_DESCRIPTORS } from "../catalog/formats";
import { resolveOptionValues } from "../catalog/options";
import { type RegisterOptions, SharedImplementationMap } from "../catalog/pluginRegistry";
import type { FormatDescriptor } from "../catalog/types";
import { assertReaderAgreesWithWriter } from "../catalog/writerRegistry";
import { AdHocData } from "../config";
import { GraphtyError } from "../errors";
import { ErrorAggregator } from "./ErrorAggregator.js";
import { columnsMapping, importWhole, toRecords } from "./graph-io-import.js";
import { type SourceData, type SourceInput, toSourceInput } from "./source-bytes.js";

/** What every reader is configured with, whatever its format. */
export interface BaseDataSourceConfig {
    /**
     * The file's contents, inline: text, or its bytes. Bytes are decoded by the importer, which
     * reads a byte-order mark and an encoding declaration; a binary format (a zip) needs them.
     */
    data?: SourceData;
    /** A file to read, as bytes. */
    file?: File;
    /** A URL to fetch, as bytes. */
    url?: string;
    chunkSize?: number;
    errorLimit?: number;
    /**
     * Which graph to read from a file that holds several, by its 0-based position. The first
     * when neither this nor `graphName` is given. `listGraphs` from `./catalog` lists them.
     */
    graphIndex?: number;
    /** Which graph to read from a file that holds several, by its name. */
    graphName?: string;
}

/**
 * What {@link DataSource.register} reads off a reader class.
 *
 * All three are `unknown` because registration is handed a class it has no reason to trust. A
 * class that forgot its `static type` used to be filed under the string "undefined", which is a
 * name a consumer can neither type nor debug; a class with no `static descriptor` used to be
 * filed as a format no picker could offer and no dropped file could be recognised as. Both are
 * now refused at the door, where the author can see them.
 */
interface FormatStatics {
    /** The name the class registers under, and the name a host asks for the format by. */
    readonly type?: unknown;
    /** What the catalogue publishes about the format. */
    readonly descriptor?: unknown;
    /** The optional content sniffer, asked after every built-in one. */
    readonly detect?: unknown;
    /** The optional lister of the graphs a file holds, for a format whose file can hold several. */
    readonly listGraphs?: unknown;
}

type DataSourceClass = (new (opts: object) => DataSource) & FormatStatics;
// Shared with every other copy of graphty-element on the page, so a plugin registered through one
// reaches them all.
const dataSourceRegistry = new SharedImplementationMap<DataSourceClass>("format");

/**
 * The keys in an options object that belong to the ELEMENT rather than to the format.
 *
 * Three of them are how bytes arrive and two are the limits the base class applies, all declared
 * by {@link BaseDataSourceConfig}. The rest are added on the caller's behalf by
 * `Graph.loadFromFile` and `Graph.loadFromUrl`, which pass the file's name and size and the
 * configured identity paths to whichever format was chosen. A format never declares any of them,
 * so {@link DataSource.resolveOptions} skips them rather than reporting them as options the
 * format has never heard of -- while a format that DOES declare one of these names (the JSON
 * reader declares all three identity paths) still has the caller's value checked and returned.
 */
const ELEMENT_OWNED_OPTIONS: ReadonlySet<string> = new Set([
    "data",
    "file",
    "url",
    "chunkSize",
    "errorLimit",
    "filename",
    "size",
    "format",
    "nodeIdPath",
    "edgeSrcIdPath",
    "edgeDstIdPath",
    "graphIndex",
    "graphName",
]);

/**
 * Refuse a registration, naming the field its author has to fix.
 * @param field - The static or the descriptor member that is wrong.
 * @param message - What is wrong with it, in a sentence.
 * @throws Always: a `GraphtyError` with `E_BAD_COMMAND`.
 */
function refuseRegistration(field: string, message: string): never {
    throw new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "registry",
        details: { kind: "format", field },
    });
}

/**
 * Check the description a reader class carries before the catalogue publishes it.
 *
 * Everything checked here is something a consumer would otherwise meet much later and much
 * further away: a format with no extensions is one no dropped file can be recognised as, and a
 * format claiming it can be written is a "Save as" menu entry that saves nothing, because there
 * is no writer seam to register into.
 * @param type - The name the class registers under.
 * @param value - The class's `static descriptor`, untrusted.
 * @returns The descriptor.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the field that is wrong.
 */
function readFormatDescriptor(type: string, value: unknown): FormatDescriptor {
    if (value === null || typeof value !== "object") {
        refuseRegistration(
            "descriptor",
            `the format "${type}" registered no description, so nothing could offer it: declare ` +
                "`static descriptor: FormatDescriptor` on the class",
        );
    }

    const fields = value as { id?: unknown; extensions?: unknown; mimeTypes?: unknown; canExport?: unknown };

    if (fields.id !== type) {
        refuseRegistration(
            "descriptor.id",
            `the reader registered as "${type}" describes itself as "${String(fields.id)}"; ` +
                "one format has one name, and the two halves disagreeing is how a catalogue entry " +
                "comes to name a reader nothing registered",
        );
    }

    if (!Array.isArray(fields.extensions) || fields.extensions.length === 0) {
        refuseRegistration(
            "descriptor.extensions",
            `the format "${type}" claims no file extension, so no file could ever be recognised as it`,
        );
    }

    for (const extension of fields.extensions) {
        if (typeof extension !== "string" || !extension.startsWith(".") || extension !== extension.toLowerCase()) {
            refuseRegistration(
                "descriptor.extensions",
                `the format "${type}" claims the extension ${JSON.stringify(extension)}; an extension is a ` +
                    "lower-case string beginning with a dot, because that is what a file name is compared against",
            );
        }
    }

    if (!Array.isArray(fields.mimeTypes) || fields.mimeTypes.length === 0) {
        refuseRegistration(
            "descriptor.mimeTypes",
            `the format "${type}" declares no media type, which is what a file picker filters on`,
        );
    }

    if (fields.canExport === true) {
        refuseRegistration(
            "descriptor.canExport",
            `the reader "${type}" says its format can be written; a writer is registered with ` +
                "registerFormatWriter, which marks the catalogue entry, so a reader's descriptor keeps canExport: false",
        );
    }

    return value as FormatDescriptor;
}

/**
 * Check the optional content sniffer a reader class carries.
 * @param type - The name the class registers under.
 * @param value - The class's `static detect`, untrusted.
 * @returns The sniffer, or undefined when the class declares none.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when it is declared and is not a function.
 */
function readFormatDetector(type: string, value: unknown): ((sample: string) => boolean) | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "function") {
        refuseRegistration(
            "detect",
            `the format "${type}" declares a \`static detect\` that is not a function, so no file could be sniffed`,
        );
    }

    return value as (sample: string) => boolean;
}

/**
 * Check the optional graph lister a reader class carries.
 * @param type - The name the class registers under.
 * @param value - The class's `static listGraphs`, untrusted.
 * @returns The lister, or undefined when the class declares none.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when it is declared and is not a function.
 */
function readGraphLister(type: string, value: unknown): GraphLister | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "function") {
        refuseRegistration(
            "listGraphs",
            `the format "${type}" declares a \`static listGraphs\` that is not a function, so no file's graphs could be listed`,
        );
    }

    return value as GraphLister;
}

export interface DataSourceChunk {
    nodes: AdHocData[];
    edges: AdHocData[];
}

/** How {@link DataSource.fromImporter} runs the importer it wraps. */
export interface ImporterSourceOptions<Opts> {
    /**
     * Options handed to the importer on every load. A descriptor option the host passes is laid
     * over them; a descriptor option the host leaves out fills its default only where these name
     * no value. `ids` defaults to "string", so an id stays the text the file wrote.
     */
    readonly importOptions?: Partial<Opts & CommonImportOptions>;
    /**
     * The words in the file that stated its direction, which the element shows beside it
     * (`directednessSource.statedBy`). Return null when the file stated none: the element's own
     * `data.directed` setting then stands. Left out, no file states a direction: a graph-io
     * importer applies its own default when the file is silent (CSV's is directed), and the
     * adapter cannot tell that default from a statement, so it claims none on the file's behalf.
     * @param snapshot - the imported graph; `snapshot.directed` is the direction the importer read
     * @param report - the importer's report
     * @returns the words, or null
     */
    readonly statedBy?: (snapshot: GraphSnapshot, report: ImportReport) => string | null;
}

/** The registrable reader {@link DataSource.fromImporter} returns. */
export type ImporterDataSourceClass = (new (config: BaseDataSourceConfig) => DataSource) & {
    readonly type: string;
    readonly descriptor: FormatDescriptor;
};

/**
 * What a file said about its own direction, as its parser read it.
 *
 * A graph is directed or it is not, and the snapshot carries exactly one flag for the whole
 * graph, so this is one boolean and not a per-edge answer. `null` from a data source means the
 * FILE said nothing -- an edge list with no header that names direction, a JSON document with no
 * `directed` key -- and a source that says nothing leaves the element's own `data.directed`
 * configuration standing, which is what "auto" means.
 */
export interface DeclaredDirection {
    /** True when the file declares a directed graph. */
    readonly directed: boolean;
    /**
     * The part of the file that said so, spelled the way the file spells it
     * (`defaultedgetype="undirected"`, `digraph`, `*Arcs`), so that a log line naming a
     * disagreement can point at the text a reader can go and look at.
     */
    readonly statedBy: string;
    /**
     * How many edges carried a direction of their own that disagrees with `directed`.
     *
     * Formats that can state direction twice -- GEXF's per-edge `type`, GraphML's per-edge
     * `directed`, a Pajek file with both an `*Arcs` and an `*Edges` section, a Gephi CSV whose
     * `Type` column varies by row -- can describe a MIXED graph, which neither graph-format nor
     * the element can represent: the snapshot has one direction flag. The importers resolve the
     * disagreement rather than dropping half of it, and count what they overrode here so the
     * element can say out loud that it did.
     *
     * Zero for a format that cannot state direction per edge, and for one that can but did not.
     */
    readonly conflictingEdges: number;
}

/**
 * Base class for all data source implementations that load graph data from various formats.
 * Provides common functionality for validation, chunking, error handling, and data fetching.
 */
export abstract class DataSource {
    static readonly type: string;
    static readonly DEFAULT_CHUNK_SIZE = 1000;

    /**
     * What the catalogue publishes about this format: its plain name, the extensions and media
     * types its files carry, and the options a host can configure reading it with.
     *
     * REQUIRED OF A REGISTERED FORMAT and refused without it, because a reader filed with no
     * description is one a picker cannot offer, `formatDescriptor` cannot find and a dropped file
     * cannot be recognised as. It is a static on the class so that one registration is the only
     * registration: a description filed separately from its reader would be a catalogue entry a
     * consumer can see, select, and then be told does not exist.
     *
     * The element's own seven do not set it -- their descriptions are the frozen built-in table
     * `./catalog` publishes, which is what keeps that table meaning "what the element ships".
     */
    static descriptor?: FormatDescriptor;

    /**
     * Reads the first bytes of a file and says whether this format claims it.
     *
     * Optional, and asked only after every built-in sniffer has been asked, so a registered format
     * can claim a file the element could not already read and can never take one a built-in
     * claims. It is also what tells two formats apart when both claim an extension -- which is how
     * a third party's XML dialect gets the disambiguation GraphML and GEXF get by namespace.
     * A sniffer that throws is treated as "no" rather than failing the import.
     */
    static detect?: (sample: string) => boolean;

    /**
     * Lists the graphs a file of this format holds, for a format whose file can hold several (a
     * Cytoscape session's networks). Optional: a format that declares it accepts the
     * `graphIndex` and `graphName` options, and `listGraphs` from `./catalog` asks it; a format
     * that does not reads its one graph and refuses a choice of any other. `fromImporter` sets it
     * from the importer's own `listGraphs`.
     */
    static listGraphs?: GraphLister;

    edgeSchema: z4.$ZodObject | null = null;
    nodeSchema: z4.$ZodObject | null = null;
    protected errorAggregator: ErrorAggregator;
    protected chunkSize: number;
    /** Backing field of {@link declaredDirection}; written only by {@link declareDirection}. */
    private declaration: DeclaredDirection | null = null;

    /**
     * Creates a new DataSource instance.
     * @param errorLimit - Maximum number of errors before stopping data processing
     * @param chunkSize - Number of nodes to process per chunk
     */
    constructor(errorLimit = 100, chunkSize = DataSource.DEFAULT_CHUNK_SIZE) {
        this.errorAggregator = new ErrorAggregator(errorLimit);
        this.chunkSize = chunkSize;
    }

    // abstract init(): Promise<void>;
    abstract sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown>;

    /**
     * Subclasses must implement this to expose their config
     * Used by getContent() and other shared methods
     */
    protected abstract getConfig(): BaseDataSourceConfig;

    /**
     * Standardized error message templates
     * @returns Object containing error message template functions
     */
    protected get errorMessages(): {
        missingInput: () => string;
        fetchFailed: (url: string, attempts: number, error: string) => string;
        parseFailed: (error: string) => string;
        invalidFormat: (reason: string) => string;
        extractionFailed: (path: string, error: string) => string;
    } {
        return {
            missingInput: () => `${this.type}DataSource requires data, file, or url`,

            fetchFailed: (url: string, attempts: number, error: string) =>
                `Failed to fetch ${this.type} from ${url} after ${attempts} attempts: ${error}`,

            parseFailed: (error: string) => `Failed to parse ${this.type}: ${error}`,

            invalidFormat: (reason: string) => `Invalid ${this.type} format: ${reason}`,

            extractionFailed: (path: string, error: string) => `Failed to extract data using path '${path}': ${error}`,
        };
    }

    /**
     * Fetch with retry logic and timeout
     * Protected method for use by all DataSources
     * @param url - URL to fetch from
     * @param retries - Number of retry attempts on failure
     * @param timeout - Timeout in milliseconds for each attempt
     * @returns Promise resolving to the fetch Response
     */
    protected async fetchWithRetry(url: string, retries = 3, timeout = 30000): Promise<Response> {
        // Data URLs don't need retries or timeouts
        if (url.startsWith("data:")) {
            return await fetch(url);
        }

        // The status of the last response that came back but was not ok, so the coded failure can
        // carry it: a consumer that wants to tell "not found" from "forbidden" reads details.status
        // rather than parsing the message.
        let lastStatus: number | undefined;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, timeout);

                try {
                    const response = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        lastStatus = response.status;
                        const { status } = response;
                        // A client error (404, 401, 403...) will answer the same on every retry,
                        // so fail at once and say the same call cannot succeed. 408 and 429 are
                        // the two client statuses that mean "try again later".
                        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                            throw new GraphtyError({
                                code: "E_FETCH_FAILED",
                                message: `Failed to fetch from ${url}: HTTP ${status}`,
                                source: "data",
                                recoverable: false,
                                details: { url, attempts: attempt + 1, status },
                            });
                        }

                        throw new Error(`HTTP error! status: ${status}`);
                    }

                    return response;
                } catch (error) {
                    clearTimeout(timeoutId);

                    if (error instanceof Error && error.name === "AbortError") {
                        throw new Error(`Request timeout after ${timeout}ms`);
                    }

                    throw error;
                }
            } catch (error) {
                if (error instanceof GraphtyError) {
                    throw error;
                }

                const isLastAttempt = attempt === retries - 1;

                if (isLastAttempt) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    throw new GraphtyError({
                        code: "E_FETCH_FAILED",
                        message: `Failed to fetch from ${url} after ${retries} attempts: ${errorMsg}`,
                        source: "data",
                        // A server that was down, a network that dropped: the same call unchanged
                        // could succeed later, which is exactly what this flag is for.
                        recoverable: true,
                        details: { url, attempts: retries, status: lastStatus },
                        cause: error,
                    });
                }

                // Exponential backoff: wait 1s, 2s, 4s...
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        // Should never reach here
        throw new GraphtyError({
            code: "E_FETCH_FAILED",
            message: `Failed to fetch from ${url} after ${retries} attempts`,
            source: "data",
            recoverable: true,
            details: { url, attempts: retries, status: lastStatus },
        });
    }

    /**
     * The source's contents as text: inline text as it is, and anything else -- bytes, a file, a
     * URL -- decoded the way graph-io decodes it (a byte-order mark names the encoding, UTF-8
     * otherwise, the mark itself dropped). For a reader that parses text itself; one that hands
     * the file to a graph-io importer calls {@link getInput} instead, so the importer can read
     * an encoding declaration too.
     * @returns The text.
     * @throws A `GraphtyError` with `E_PARSE_FAILED` when the bytes cannot be decoded.
     */
    protected async getContent(): Promise<string> {
        const input = await this.getInput();
        if (typeof input === "string") {
            return input;
        }

        try {
            return await readText(input, new ImportReportBuilder(this.type, 0));
        } catch (error) {
            // Bytes that are not text in any encoding the decoder could settle on (invalid UTF-8
            // after valid non-ASCII UTF-8): the file cannot be read, and the caller is told so
            // with a code, not graph-io's bare ImportError.
            throw GraphtyError.wrap(error, {
                code: "E_PARSE_FAILED",
                source: "data",
                message: `Failed to read the ${this.type} file as text: ${error instanceof Error ? error.message : String(error)}`,
                details: { format: this.type },
            });
        }
    }

    /**
     * The source's contents as bytes: inline bytes as they are, inline text as UTF-8, a file's
     * bytes, or a URL's (fetched with retries). Nothing is decoded, so a binary format -- a zip --
     * arrives intact.
     * @returns The bytes.
     * @throws An `Error` naming the reader when the configuration has no data, file or URL.
     */
    protected async getBytes(): Promise<Uint8Array> {
        const input = await this.getInput();
        return typeof input === "string" ? new TextEncoder().encode(input) : input;
    }

    /**
     * The source's contents as a graph-io importer's input: inline text as the caller gave it,
     * and everything else as bytes for the importer to decode.
     * @returns The text or the bytes.
     * @throws An `Error` naming the reader when the configuration has no data, file or URL.
     */
    protected async getInput(): Promise<SourceInput> {
        const config = this.getConfig();

        if (config.data !== undefined) {
            return toSourceInput(config.data);
        }

        if (config.file) {
            return new Uint8Array(await config.file.arrayBuffer());
        }

        if (config.url) {
            const response = await this.fetchWithRetry(config.url);
            return new Uint8Array(await response.arrayBuffer());
        }

        throw new Error(this.errorMessages.missingInput());
    }

    /**
     * The graph the caller chose, checked.
     *
     * A format whose file can hold several graphs declares `static listGraphs` and reads the
     * one this names. Any other format holds one graph, so `graphIndex: 0` is accepted and any
     * other choice is refused rather than quietly loading the one graph there is.
     * @returns The choice, with only the keys the caller set.
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a `graphIndex` that is not a
     * non-negative integer, a `graphName` that is not a string, both at once, or a choice this
     * format cannot honour.
     */
    protected graphChoice(): GraphChoiceOptions {
        const { graphIndex, graphName } = this.getConfig() as { graphIndex?: unknown; graphName?: unknown };
        const refuse = (option: string, value: unknown, message: string): never => {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message,
                source: "config",
                details: { kind: "format", id: this.type, option, value },
            });
        };

        if (
            graphIndex !== undefined &&
            (typeof graphIndex !== "number" || !Number.isInteger(graphIndex) || graphIndex < 0)
        ) {
            refuse(
                "graphIndex",
                graphIndex,
                `"graphIndex" takes a non-negative integer, not ${JSON.stringify(graphIndex)}`,
            );
        }

        if (graphName !== undefined && typeof graphName !== "string") {
            refuse("graphName", graphName, `"graphName" takes a string, not ${JSON.stringify(graphName)}`);
        }

        if (graphIndex !== undefined && graphName !== undefined) {
            refuse("graphName", graphName, 'pass "graphIndex" or "graphName" to choose a graph, not both');
        }

        const lists = (this.constructor as typeof DataSource).listGraphs !== undefined;
        if (!lists && (graphName !== undefined || (graphIndex !== undefined && graphIndex !== 0))) {
            refuse(
                graphName === undefined ? "graphIndex" : "graphName",
                graphName ?? graphIndex,
                `a ${this.type} file holds one graph, so there is no other graph to choose`,
            );
        }

        return {
            ...(graphIndex === undefined ? {} : { graphIndex: graphIndex as number }),
            ...(graphName === undefined ? {} : { graphName: graphName as string }),
        };
    }

    /**
     * Fill in the defaults this format declares and refuse a value it would not accept.
     *
     * ONE OPTIONS MECHANISM. A format declares its options as `OptionDescriptor[]` on its
     * `static descriptor`, which is the same plain-JSON declaration `session.catalog.formats()`
     * hands a host building an import dialog, and this checks the host's values against that one
     * declaration. The form a host renders, the catalogue entry it renders from and the values
     * this accepts therefore cannot disagree, and a failure is reported in the one vocabulary
     * every other extension point uses: `E_UNKNOWN_OPTION` with the declared names and the
     * nearest few, `E_OPTION_RANGE` with the range and the value passed.
     *
     * CALL IT WHEN THE OPTION SET IS CLOSED. The keys the element itself puts in an options
     * object are skipped, but any other undeclared key is reported -- so a format that quietly
     * accepts more than it declares (the CSV reader takes a separate node file and edge file it
     * never lists) should declare those first.
     * @param passed - What the host handed the source; a constructor's own argument.
     * @returns Every declared option, the host's value where it gave one and the declared default
     * everywhere else.
     * @throws A `GraphtyError` with `E_UNKNOWN_OPTION` for a name this format does not declare, or
     * `E_OPTION_RANGE` for a value it would not accept.
     */
    protected resolveOptions(passed: object): Record<string, unknown> {
        const statics = this.constructor as typeof DataSource;
        const declared = statics.descriptor?.options ?? [];
        const declaredNames = new Set(declared.map((option) => option.name));
        const relevant: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(passed)) {
            // A declared name is checked even when the element also uses it -- the JSON reader
            // declares all three identity paths -- so this test comes first.
            if (declaredNames.has(key) || !ELEMENT_OWNED_OPTIONS.has(key)) {
                relevant[key] = value;
            }
        }

        return resolveOptionValues(declared, relevant, { kind: "format", id: this.type });
    }

    /**
     * Shared chunking helper
     * Yields nodes in chunks, with all edges in the first chunk
     * @param nodes - Array of node data objects
     * @param edges - Array of edge data objects
     * @yields DataSourceChunk objects containing chunked nodes and edges
     */
    protected *chunkData(nodes: AdHocData[], edges: AdHocData[]): Generator<DataSourceChunk, void, unknown> {
        // Yield nodes in chunks
        for (let i = 0; i < nodes.length; i += this.chunkSize) {
            const nodeChunk = nodes.slice(i, i + this.chunkSize);
            const edgeChunk = i === 0 ? edges : [];
            yield { nodes: nodeChunk, edges: edgeChunk };
        }

        // If no nodes but edges exist, yield edges-only chunk
        if (nodes.length === 0 && edges.length > 0) {
            yield { nodes: [], edges };
        }
    }

    /**
     * Get the error aggregator for this data source
     * @returns The ErrorAggregator instance tracking validation errors
     */
    getErrorAggregator(): ErrorAggregator {
        return this.errorAggregator;
    }

    /**
     * The direction this file declared, or null when it declared none.
     *
     * READ IT PER CHUNK, not once before the loop. Parsing does not begin until the first chunk
     * is pulled -- `getData()` is a generator over a generator -- so this is null until then, and
     * the caller that reads it before iterating will always read null. Reading it at the top of
     * each loop body gets the declaration before that chunk's edges are pushed, which is the one
     * thing the builder requires: it accepts a direction change only while it holds no edges.
     * @returns the declaration, or null when the file was silent
     */
    get declaredDirection(): DeclaredDirection | null {
        return this.declaration;
    }

    /**
     * Record what the file being parsed said about its own direction.
     *
     * Call it from the parse, BEFORE the first chunk is yielded, and only when the file actually
     * states the direction -- through a header that carries it, or through a default the format's
     * own specification assigns to a file that omits that header. A format that leaves direction
     * open must not call this at all: guessing here would overrule the element's configuration
     * with an invention.
     * @param directed - true when the file declares a directed graph
     * @param statedBy - the text in the file that said so, for a log line
     * @param conflictingEdges - how many edges declared the opposite; see {@link DeclaredDirection}
     */
    protected declareDirection(directed: boolean, statedBy: string, conflictingEdges = 0): void {
        this.declaration = { directed, statedBy, conflictingEdges };
    }

    /**
     * Fetches, validates, and yields graph data in chunks.
     * Filters out invalid nodes and edges based on schema validation.
     * @yields DataSourceChunk objects containing validated nodes and edges
     */
    async *getData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // Checked before anything is read, so a bad choice costs no download.
        this.graphChoice();
        for await (const chunk of this.sourceFetchData()) {
            // Filter out invalid nodes
            const validNodes: AdHocData[] = [];
            if (this.nodeSchema) {
                for (const n of chunk.nodes) {
                    const isValid = await this.dataValidator(this.nodeSchema, n);
                    if (isValid) {
                        validNodes.push(n);
                    }
                    // Invalid nodes are logged to errorAggregator but skipped
                }
            } else {
                validNodes.push(...chunk.nodes);
            }

            // Filter out invalid edges
            const validEdges: AdHocData[] = [];
            if (this.edgeSchema) {
                for (const e of chunk.edges) {
                    const isValid = await this.dataValidator(this.edgeSchema, e);
                    if (isValid) {
                        validEdges.push(e);
                    }
                }
            } else {
                validEdges.push(...chunk.edges);
            }

            // Only yield if we have data (or if we're not filtering)
            if (validNodes.length > 0 || validEdges.length > 0) {
                yield { nodes: validNodes, edges: validEdges };
            }

            // Stop if we've hit the error limit
            if (this.errorAggregator.hasReachedLimit()) {
                break;
            }
        }
    }

    /**
     * Validate data against schema
     * Returns false if validation fails (and adds error to aggregator)
     * Returns true if validation succeeds
     * @param schema - Zod schema to validate against
     * @param obj - Data object to validate
     * @returns Promise resolving to true if validation succeeds, false otherwise
     */
    async dataValidator(schema: z4.$ZodObject, obj: object): Promise<boolean> {
        const res = await z4.safeParseAsync(schema, obj);

        if (!res.success) {
            const errMsg = z.prettifyError(res.error);

            this.errorAggregator.addError({
                message: `Validation failed: ${errMsg}`,
                category: "validation-error",
            });

            return false; // Validation failed
        }

        return true; // Validation passed
    }

    /**
     * Gets the type identifier for this data source instance.
     * @returns The type string identifier
     */
    get type(): string {
        return (this.constructor as typeof DataSource).type;
    }

    /**
     * Register a file format: its reader, and the description everything else finds it by.
     *
     * ONE ACT, NOT TWO. Filing the class is what makes the format loadable; publishing its
     * `static descriptor` is what puts it in `session.catalog.formats()`, in `formatDescriptor`,
     * in `formatsForExtension` and in detection. They happen together because a reader with no
     * description is invisible to every picker and to every dropped file, and a description
     * without its reader is a catalogue entry a consumer can see, select, and then be told does
     * not exist.
     *
     * THE ELEMENT'S OWN SEVEN TAKE THE OTHER BRANCH. A class registering under a name that is
     * already in the built-in format table is the element registering one of its own readers; its
     * description is the frozen table `./catalog` publishes, and there is nothing to publish. A
     * SECOND registration under such a name is refused, so no plugin can change what `json` means
     * for a document that was saved yesterday.
     * @param cls - The reader class, carrying `static type` and -- unless the element ships this
     *   format -- `static descriptor` and an optional `static detect`.
     * @param options - Pass `{ strict: true }` to refuse a second registration under a name this
     *   build already gave to a different format, instead of replacing it with a warning.
     * @returns The registered class, so a declaration can be wrapped in the call.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the static or the descriptor member
     * that is missing or wrong, or with `E_DUPLICATE_PLUGIN` for a format name the element ships.
     */
    static register<T extends DataSourceClass>(cls: T, options?: RegisterOptions): T {
        const { type } = cls;

        if (typeof type !== "string" || type === "") {
            refuseRegistration(
                "type",
                "a data source registers under the name in its `static type`, and this class declares none",
            );
        }

        if (FORMAT_DESCRIPTORS.some((descriptor) => descriptor.id === type)) {
            if (dataSourceRegistry.hasOwn(type)) {
                throw new GraphtyError({
                    code: "E_DUPLICATE_PLUGIN",
                    message:
                        `"${type}" is a format the element ships and already reads, and a built-in name may ` +
                        "not be taken: a document that named it yesterday has to mean the same thing today",
                    source: "registry",
                    details: { kind: "format", name: type, builtIn: true },
                });
            }

            dataSourceRegistry.set(type, cls);
            return cls;
        }

        const detect = readFormatDetector(type, cls.detect);
        const listGraphs = readGraphLister(type, cls.listGraphs);

        // Published BEFORE the class is filed, so a refusal leaves neither half registered: a
        // reader loadable by name that no catalogue lists is the state this whole seam exists to
        // end, and half-succeeding here would recreate it.
        const descriptor = readFormatDescriptor(type, cls.descriptor);
        assertReaderAgreesWithWriter(descriptor);
        publishFormatDescriptor(
            {
                descriptor,
                type,
                ...(detect === undefined ? {} : { detect }),
                ...(listGraphs === undefined ? {} : { listGraphs }),
            },
            options,
        );

        dataSourceRegistry.set(type, cls);
        return cls;
    }

    /**
     * Turn a graph-io importer into a reader class, ready for {@link DataSource.register}.
     *
     * For an author who already has a `GraphImporter` (an object whose `import(input, sink,
     * options)` pushes nodes and edges into a builder). The class reads its input the way every
     * reader does -- inline `data`, a `File` or a `url` with retries -- and hands the importer
     * inline text as it is and anything else as bytes, which the importer decodes. When the
     * importer has `listGraphs`, the class has it too, so `listGraphs` from `./catalog` lists a
     * file's graphs and the `graphIndex` / `graphName` load options reach the importer. Each node and edge attribute the importer set becomes a key of the record under
     * its column name; an edge's weight becomes `weight`. A repeated node keeps its first
     * declaration, as the element keeps a repeated record. The importer's errors are aggregated
     * like any reader's, and a file the importer gives up on (it throws graph-io's `ImportError`)
     * fails the load with `E_PARSE_FAILED` naming the format and the line, leaving the graph on
     * screen as it was. The options the descriptor declares are checked against what a host
     * passes, filled with their defaults, and handed to the importer.
     *
     * Throw the `ImportError` re-exported by `@graphty/graphty-element/extend`, not one from your
     * own copy of graph-io, or the element cannot tell a refusal from a crash.
     * @param importer - the graph-io importer
     * @param descriptor - the format's catalogue entry; its `id` is the name the class registers under
     * @param options - fixed importer options and how the file states its direction
     * @returns a `DataSource` subclass whose `type` is `descriptor.id`
     * @throws A `GraphtyError` with `E_BAD_COMMAND`, `details.field: "importer"`, when `importer` has
     * no `import` method.
     */
    static fromImporter<Opts>(
        importer: GraphImporter<Opts>,
        descriptor: FormatDescriptor,
        options: ImporterSourceOptions<Opts> = {},
    ): ImporterDataSourceClass {
        if (typeof importer !== "object" || typeof (importer as Partial<GraphImporter> | null)?.import !== "function") {
            refuseRegistration(
                "importer",
                `the reader for "${descriptor.id}" needs a graph-io importer: an object with import(input, sink, options)`,
            );
        }

        const { importOptions = {}, statedBy } = options;
        const sniff = importer.sniff?.bind(importer);
        const list = importer.listGraphs?.bind(importer);

        return class ImporterDataSource extends DataSource {
            static override readonly type: string = descriptor.id;
            static override readonly descriptor: FormatDescriptor = descriptor;
            // The importer's sniffer, held to the confidence the built-in sniffers are held to.
            static override readonly detect =
                sniff === undefined
                    ? undefined
                    : (sample: string): boolean => sniff(new TextEncoder().encode(sample)) >= MIN_CONTENT_CONFIDENCE;
            // The importer's lister, handed the same fixed options its import is.
            static override readonly listGraphs =
                list === undefined
                    ? undefined
                    : (input: SourceInput): Promise<readonly GraphListing[]> =>
                          list(input, importOptions as Opts & CommonImportOptions);

            readonly #config: BaseDataSourceConfig;
            readonly #options: Record<string, unknown>;

            constructor(config: BaseDataSourceConfig) {
                super(config.errorLimit ?? 100, config.chunkSize);
                this.#config = config;
                this.#options = this.resolveOptions(config);
            }

            protected getConfig(): BaseDataSourceConfig {
                return this.#config;
            }

            /**
             * The fixed options, with the descriptor options the host passed laid over them and
             * the defaults of the ones it left out filling only what the fixed options leave open.
             * @returns the options handed to the importer
             */
            #importerOptions(): Opts & CommonImportOptions {
                const merged: Record<string, unknown> = { ...this.#options, ...importOptions };
                const passed = this.#config as unknown as Record<string, unknown>;
                for (const [name, value] of Object.entries(this.#options)) {
                    if (passed[name] !== undefined) {
                        merged[name] = value;
                    }
                }

                return { ...merged, ...this.graphChoice() } as Opts & CommonImportOptions;
            }

            async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                const imported = await importWhole(
                    importer,
                    await this.getInput(),
                    this.#importerOptions(),
                    this.errorAggregator,
                    { firstDeclarationWins: true },
                );
                const { snapshot, report } = imported;
                const words = statedBy?.(snapshot, report) ?? null;
                if (words !== null) {
                    this.declareDirection(snapshot.directed, words, report.counts.expandedMixed);
                }

                const { nodes, edges } = toRecords(imported, columnsMapping(snapshot));
                yield* this.chunkData(nodes, edges);
            }
        };
    }

    /**
     * Turn a plain object into a record the element ingests.
     *
     * A record is typed `AdHocData`, which is a branded map, and no object literal carries the
     * brand -- so a format author writing typed records used to be forced into a double cast, and
     * the element's own readers write one too. The cast belongs here, once, in the element, rather
     * than in every reader that was ever written.
     *
     * Two keys on a node record mean something to the element beyond being data: `position`
     * (`{x, y, z}`, `[x, y]` or `[x, y, z]`) seeds the node's coordinates in FILE units, so a
     * graph that arrives with positions arrives placed; and on an edge record the configured
     * weight key -- `weight` unless `data.knownFields.edgeWeightPath` says otherwise -- is the
     * weight algorithms and styles read.
     * @param fields - The record's keys and values.
     * @returns The same object, typed as a record the element accepts.
     */
    static toRecord(fields: Readonly<Record<string, unknown>>): AdHocData {
        return fields as AdHocData;
    }

    /**
     * Turn plain objects into records the element ingests. See {@link DataSource.toRecord}.
     * @param records - The records' keys and values.
     * @returns The same objects, typed as records the element accepts.
     */
    static toRecords(records: readonly Readonly<Record<string, unknown>>[]): AdHocData[] {
        return records as AdHocData[];
    }

    /**
     * Creates a data source instance by type name.
     * @param type - The registered type identifier
     * @param opts - Configuration options for the data source
     * @returns A new data source instance or null if type not found
     */
    static get(type: string, opts: object = {}): DataSource | null {
        const SourceClass = dataSourceRegistry.get(type);
        if (SourceClass) {
            return new SourceClass(opts);
        }

        return null;
    }

    /**
     * Get all registered data source types.
     * @returns Array of registered data source type names
     * @since 1.5.0
     * @example
     * ```typescript
     * const types = DataSource.getRegisteredTypes();
     * console.log('Available data sources:', types);
     * // ['csv', 'gexf', 'gml', 'graphml', 'json', 'pajek']
     * ```
     */
    static getRegisteredTypes(): string[] {
        return Array.from(dataSourceRegistry.keys()).sort();
    }
}
