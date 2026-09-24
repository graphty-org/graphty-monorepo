import { z } from "zod/v4";
import * as z4 from "zod/v4/core";

import { publishFormatDescriptor } from "../catalog/formatRegistry";
import { FORMAT_DESCRIPTORS } from "../catalog/formats";
import { resolveOptionValues } from "../catalog/options";
import type { RegisterOptions } from "../catalog/pluginRegistry";
import type { FormatDescriptor } from "../catalog/types";
import { AdHocData } from "../config";
import { GraphtyError } from "../errors";
import { ErrorAggregator } from "./ErrorAggregator.js";

// Base configuration interface
export interface BaseDataSourceConfig {
    data?: string;
    file?: File;
    url?: string;
    chunkSize?: number;
    errorLimit?: number;
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
}

type DataSourceClass = (new (opts: object) => DataSource) & FormatStatics;
const dataSourceRegistry = new Map<string, DataSourceClass>();

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
            `the format "${type}" says it can be written, and there is nowhere to register a writer: a ` +
                '"Save as" menu built from the catalogue would offer a format nothing can save',
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

export interface DataSourceChunk {
    nodes: AdHocData[];
    edges: AdHocData[];
}

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
                        throw new Error(`HTTP error! status: ${response.status}`);
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
     * Shared method to get content from data, file, or URL
     * Subclasses should call this instead of implementing their own
     * @returns Promise resolving to the content string
     */
    protected async getContent(): Promise<string> {
        const config = this.getConfig();

        if (config.data !== undefined) {
            return config.data;
        }

        if (config.file) {
            return await config.file.text();
        }

        if (config.url) {
            const response = await this.fetchWithRetry(config.url);
            return await response.text();
        }

        throw new Error(this.errorMessages.missingInput());
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
            if (dataSourceRegistry.has(type)) {
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

        // Published BEFORE the class is filed, so a refusal leaves neither half registered: a
        // reader loadable by name that no catalogue lists is the state this whole seam exists to
        // end, and half-succeeding here would recreate it.
        publishFormatDescriptor(
            {
                descriptor: readFormatDescriptor(type, cls.descriptor),
                type,
                ...(detect === undefined ? {} : { detect }),
            },
            options,
        );

        dataSourceRegistry.set(type, cls);
        return cls;
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
