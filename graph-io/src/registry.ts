/**
 * The importer / exporter registry: the built-in formats
 * registered by name, `sniff()` over them, and the two conveniences for callers who do not own a
 * sink: `importGraph()` sniffs the format, creates a builder seeded from the common options
 * (`directed: true` as a placeholder; the importer sets the real value), imports and freezes;
 * `exportGraph()` looks the exporter up by name. A caller who owns a builder uses the importer
 * objects directly (the subpath exports) and this module never touches their sink.
 */

import {
    type FreezeOptions,
    type FreezeReport,
    GraphBuilder,
    type GraphBuilderOptions,
    GraphFormatError,
    type GraphSnapshot,
} from "@graphty/graph-format";

import { CellBudgetBuilder, maxEmptyCellsOption } from "./common/cell-budget.js";
import { EDGES_MERGED_CODE, FETCH_CODE, SELF_LOOPS_DROPPED_CODE } from "./common/codes.js";
import { abortable, foreignKind, lockReader, normalizeInput, throwIfAborted } from "./common/input.js";
import { chooseGraph, resolveImportOptions } from "./common/options.js";
import { agree, plural } from "./common/plural.js";
import { ImportReportBuilder, isAbortError, messageOf } from "./common/report.js";
import { collectBytes } from "./common/writer.js";
import { csvExporter, csvImporter } from "./formats/csv/index.js";
import { cxExporter, cxImporter } from "./formats/cx/index.js";
import { cx2Exporter, cx2Importer } from "./formats/cx2/index.js";
import { cysExporter, cysImporter } from "./formats/cys/index.js";
import { dotExporter, dotImporter } from "./formats/dot/index.js";
import { gexfExporter, gexfImporter } from "./formats/gexf/index.js";
import { gmlExporter, gmlImporter } from "./formats/gml/index.js";
import { graphmlExporter, graphmlImporter } from "./formats/graphml/index.js";
import { jsonExporter, jsonImporter } from "./formats/json/index.js";
import { neo4jExporter, neo4jImporter } from "./formats/neo4j/index.js";
import { oboExporter, oboImporter } from "./formats/obo/index.js";
import { pajekExporter, pajekImporter } from "./formats/pajek/index.js";
import { xgmmlExporter, xgmmlImporter } from "./formats/xgmml/index.js";
import { type FormatName, rankFormats, SNIFF_HEAD_BYTES, type SniffHints, type SniffResult } from "./sniff.js";
import {
    type CommonExportOptions,
    type CommonImportOptions,
    type ExportCapabilities,
    type GraphChoiceOptions,
    type GraphExporter,
    type GraphImporter,
    type GraphListing,
    ImportError,
    type ImportInput,
    type ImportIssue,
    type ImportReport,
    type IssueCategory,
    type LossNote,
} from "./types.js";

/**
 * The input is in no format graph-io can read (or none of the formats you registered, for your own FormatRegistry).
 * Pass `format` when you know what the file is.
 * @category Issue and loss codes
 */
export const UNKNOWN_FORMAT_CODE = "E_UNKNOWN_FORMAT";

/**
 * Registered importer whose sniff() threw while the format was being chosen; that importer was treated as not
 * recognizing the input (a defect in that importer).
 * @category Issue and loss codes
 */
export const SNIFF_FAILED_CODE = "W_SNIFF_FAILED";

/**
 * The `builder` option of importGraph(): settings for building the graph that the common import
 * options do not cover. `weighted`: "auto" (the default) gives the graph weights when any edge has
 * one, true always does (every weight 1 when the file has none), false never does. `expectedNodes`
 * and `expectedEdges`: how many nodes and edges to make room for up front, which saves time on a
 * large file whose size you know.
 * @category Loading
 */
export type BuilderSeed = Omit<
    GraphBuilderOptions,
    "directed" | "addMissingNodes" | "duplicateEdges" | "selfLoops" | "weightDtype"
>;

/**
 * The options of importGraph(), importAllGraphs(), listGraphs() and loadFromFile(): the common
 * import options, the format and the hints used to detect it, the graph to read from a file that
 * holds several, and any format-specific option (`delimiter`, `dialect`, ...), which reaches the
 * importer unchanged.
 * @category Loading
 */
export interface ImportGraphOptions extends CommonImportOptions, GraphChoiceOptions {
    /**
     * The format to read the input as ("graphml", "csv", ...; `listFormats()` names them all), or
     * "auto" to work it out from `filename`, `mimeType` and the first bytes of the input. Name it to
     * be strict: detection reads a file graph-io cannot place as the closest format it recognizes.
     * @defaultValue "auto"
     */
    readonly format?: FormatName | "auto" | undefined;
    /**
     * The file name or full path the input came from; only its extension is used, as a format hint.
     * loadFromUrl() takes it from the URL and loadFromFile() from a File's name when you do not pass
     * it.
     */
    readonly filename?: string | null | undefined;
    /**
     * The MIME type the input was served as, a format hint. loadFromUrl() takes it from the
     * response's Content-Type and loadFromFile() from the Blob's `type` when you do not pass it.
     */
    readonly mimeType?: string | null | undefined;
    /**
     * Settings for building the graph: `weighted` ("auto", true or false: whether the graph gets
     * weights), `expectedNodes` and `expectedEdges` (room to make up front for a large file). Most
     * programs never set it.
     */
    readonly builder?: BuilderSeed | undefined;
    /**
     * Settings for the last step of an import, which turns what was read into the snapshot:
     * `label` (a name for debugging, read back as `snapshot.label`), `prepare` (views of the graph
     * to compute up front, such as `["reverse"]`), `checksum` (record checksums, which
     * `snapshot.validate({ checksum: true })` compares later to catch changed memory) and `profile` (record how long each step took, in `result.freeze.timings`). Most
     * programs never set it.
     */
    readonly freeze?: FreezeOptions | undefined;
    /**
     * The most attribute slots that hold no value the import may allocate before it stops with
     * E_TOO_MANY_EMPTY_CELLS. Every attribute is a column with one slot per node (or edge), so a file
     * whose nodes each have a differently named attribute would otherwise need nodes x attributes
     * memory. Infinity turns the check off. Files whose elements mostly share their attributes are
     * never stopped.
     * @defaultValue 16777216
     */
    readonly maxEmptyCells?: number | undefined;
    /** Format-specific options, passed to the importer as they are. */
    readonly [formatOption: string]: unknown;
}

/**
 * What importGraph(), loadFromUrl() and loadFromFile() return.
 * @category Loading
 */
export interface ImportGraphResult {
    /** The format the input was read as ("graphml", ...). */
    readonly format: string;
    /**
     * How the format was detected (the candidate's `confidence` and what matched), or null when you
     * named the format. Most callers can ignore it. For the JSON dialect that was read, call
     * `jsonShapeOf(snapshot)` from `@graphty/graph-io/json`.
     */
    readonly sniff: SniffResult | null;
    /**
     * The graph. `snapshot.nodeCount`, `snapshot.edgeCount`, attribute tables and so on come from
     * the `@graphty/graph-format` package.
     */
    readonly snapshot: GraphSnapshot;
    /**
     * What happened during the import. `errorCount` counts skipped elements (see `errorLimit`,
     * default 100); `warningCount` counts elements that were kept but changed; `issues` lists both;
     * `counts.skippedNodes` / `counts.skippedEdges` say how much is missing from `snapshot`.
     */
    readonly report: ImportReport;
    /**
     * What the last step of the import did to the graph: `mergedEdges` (parallel edges merged by
     * `duplicateEdges`), `droppedSelfLoops` (removed by `selfLoops: "drop"`), and `timings` when you
     * passed `freeze: { profile: true }`. Both counts are also reported as warnings, so most callers
     * can ignore it.
     */
    readonly freeze: FreezeReport;
}

/**
 * Options for loadFromUrl(): everything importGraph() accepts, plus the fetch request settings.
 * @example
 * ```ts
 * await loadFromUrl("/api/graph.csv", { request: { headers: { Authorization: token } }, delimiter: ";" });
 * ```
 * @category Loading
 */
export interface LoadFromUrlOptions extends ImportGraphOptions {
    /**
     * Passed to fetch() as its second argument: headers, credentials, mode and so on. If you set
     * `signal` in the import options and not here, the same signal also cancels the download.
     */
    readonly request?: RequestInit | undefined;
}

/**
 * Options for downloadGraph(): the export options plus the name of the saved file.
 * @example
 * ```ts
 * await downloadGraph(snapshot, "graphml", { filename: "network.graphml" });
 * ```
 * @category Saving
 */
export interface DownloadGraphOptions extends ExportGraphOptions {
    /**
     * The file name the browser saves as. The default is "graph" plus the first entry of the
     * format's `extensions` ("graph.graphml"), or "graph.<format>" when it lists none.
     * @defaultValue "graph" plus the format's extension
     */
    readonly filename?: string | undefined;
}

/**
 * One format the registry can read, write or both.
 * @category Formats and detection
 */
export interface FormatInfo {
    /** The name you pass as `format`: "graphml", "gexf", "csv", "pajek", ... */
    readonly format: string;
    /**
     * File extensions with the leading dot, most common first (".graphml", ".net"). Empty only for a
     * custom format that declares none.
     */
    readonly extensions: readonly string[];
    /** MIME types, most specific first. Empty when the format declares none. */
    readonly mimeTypes: readonly string[];
    /** Whether loadFromUrl(), loadFromFile() and importGraph() can read it. */
    readonly canImport: boolean;
    /** Whether the export functions can write it. */
    readonly canExport: boolean;
    /**
     * What the format can store exactly, or null when it cannot be written. The fields are
     * mixedDirection, multiEdges, selfLoops, edgeIds, idCharset, dtypes, components, lists, json,
     * defaults, options, hierarchy, temporal, graphAttributes, positions and viz (each documented on
     * ExportCapabilities). checkExport() tells you where a particular graph goes beyond this.
     */
    readonly capabilities: ExportCapabilities | null;
}

/**
 * The options of exportGraph(): the common export options plus any format-specific option, passed through.
 * @category Saving
 */
export interface ExportGraphOptions extends CommonExportOptions {
    /** Format-specific options, passed to the exporter as they are. */
    readonly [formatOption: string]: unknown;
}

/** The keys of ImportGraphOptions that belong to the registry, never to an importer. */
const REGISTRY_KEYS: ReadonlySet<string> = new Set([
    "format",
    "filename",
    "mimeType",
    "builder",
    "freeze",
    "maxEmptyCells",
]);

/**
 * A registry of importers and exporters by format name. Registration order is the tie-break
 * order of sniffing; the default registry lists the built-in formats in the
 * order of GRAPH_FORMATS.
 * @category Formats and detection
 */
export class FormatRegistry {
    private readonly importerMap = new Map<string, GraphImporter>();

    private readonly exporterMap = new Map<string, GraphExporter>();

    /**
     * Register an importer under its format name, replacing one of the same name in place (the
     * original registration order is kept).
     * @param importer - the importer
     * @returns this registry, for chaining
     */
    registerImporter(importer: GraphImporter): this {
        this.importerMap.set(importer.format, importer);
        return this;
    }

    /**
     * Register an exporter under its format name, replacing one of the same name.
     * @param exporter - the exporter
     * @returns this registry, for chaining
     */
    registerExporter(exporter: GraphExporter): this {
        this.exporterMap.set(exporter.format, exporter);
        return this;
    }

    /**
     * The importer of a format.
     * @param format - the format name
     * @returns the importer; E_UNSUPPORTED when none is registered
     */
    importer(format: FormatName): GraphImporter {
        const importer = this.importerMap.get(format);
        if (importer === undefined) {
            throw unknownFormat("importer", format, this.importerMap.keys());
        }
        return importer;
    }

    /**
     * The exporter of a format.
     * @param format - the format name
     * @returns the exporter; E_UNSUPPORTED when none is registered
     */
    exporter(format: FormatName): GraphExporter {
        const exporter = this.exporterMap.get(format);
        if (exporter === undefined) {
            throw unknownFormat("exporter", format, this.exporterMap.keys());
        }
        return exporter;
    }

    /**
     * Whether an importer is registered for a format.
     * @param format - the format name
     * @returns true when importer(format) would succeed
     */
    hasImporter(format: FormatName): boolean {
        return this.importerMap.has(format);
    }

    /**
     * Whether an exporter is registered for a format.
     * @param format - the format name
     * @returns true when exporter(format) would succeed
     */
    hasExporter(format: FormatName): boolean {
        return this.exporterMap.has(format);
    }

    /**
     * Every registered importer, in registration order.
     * @returns the importers
     */
    importers(): readonly GraphImporter[] {
        return [...this.importerMap.values()];
    }

    /**
     * Every registered exporter, in registration order.
     * @returns the exporters
     */
    exporters(): readonly GraphExporter[] {
        return [...this.exporterMap.values()];
    }

    /**
     * The names of every format with an importer or an exporter, importers' order first.
     * @returns the format names, each once
     */
    formats(): readonly string[] {
        return [...new Set([...this.importerMap.keys(), ...this.exporterMap.keys()])];
    }

    /**
     * Every format that could be the input, best first, from the same hints as sniff(): use it to
     * offer the user a choice when the best guess is not certain.
     * @param hints - `{ filename, mimeType, head }`, any of them
     * @returns the candidates, best first; empty when no format claims the input
     */
    sniffAll(hints: SniffHints): readonly SniffResult[] {
        return rankFormats(hints, this.importerMap.values());
    }

    /**
     * The best importer for an input, or null when no registered importer claims it.
     * @param hints - the filename, MIME type and / or head of the input
     * @returns the best candidate, or null
     */
    sniff(hints: SniffHints): SniffResult | null {
        const ranked = this.sniffAll(hints);
        return ranked.length > 0 ? ranked[0] : null;
    }

    /**
     * Read a graph from a string, bytes or a stream. The format is the one you name in `format`,
     * else it is detected from `filename`, `mimeType` and the first bytes of the content. From an
     * input that holds several graphs, it reads the one `graphIndex` or `graphName` chooses, else
     * the first, with a W_MULTIPLE_GRAPHS warning; importAllGraphs() returns every one.
     * @param input - the text, bytes, stream or chunks to read
     * @param options - the format, hints, common and format-specific import options
     * @returns the graph (`snapshot`), the format it was read as, and the import report
     */
    async importGraph(input: ImportInput, options: ImportGraphOptions | CommonImportOptions = {}): Promise<ImportGraphResult> {
        const opts = options as ImportGraphOptions;
        const chosen = await this.choose(input, opts);
        const { importer } = chosen;
        if (
            (opts.graphIndex !== undefined || opts.graphName !== undefined) &&
            importer.importAll !== undefined &&
            importer.listGraphs === undefined
        ) {
            // an importer that reads several graphs but does not choose among them itself (DOT, GML,
            // Pajek): read them all and return the chosen one, so the choice is never ignored
            const all = await this.readAll(chosen, opts);
            const names = all.map((r) => r.snapshot.meta.name);
            return all[chooseGraph(names, opts, new ImportReportBuilder(importer.format, 0))];
        }
        let builder: GraphBuilder;
        let report: ImportReport;
        try {
            builder = seededBuilder(opts, chosen.importer.format);
            report = await chosen.importer.import(chosen.source, builder, importerOptions(opts));
        } catch (err) {
            await chosen.peeked?.close();
            throw chosen.sniff === null ? notReadableAs(err, importer.format, opts.filename) : err;
        }
        return result(chosen, builder, report, opts);
    }

    /**
     * Fetch a graph file from a URL and load it; see the top-level loadFromUrl() for the full
     * description.
     * @param url - an absolute URL, or in a browser one relative to the page
     * @param options - import options, plus `request` for fetch
     * @returns the graph, the format it was read as, and the import report
     */
    async loadFromUrl(url: string | URL, options: LoadFromUrlOptions | CommonImportOptions = {}): Promise<ImportGraphResult> {
        const opts = options as LoadFromUrlOptions;
        const { request, ...rest } = opts;
        const signal = request?.signal ?? rest.signal ?? null;
        const method = request?.method ?? "GET";
        const where = `${method} ${String(url)}`;
        let response: Response;
        try {
            response = await fetch(url, { signal: rest.signal, ...request });
        } catch (err) {
            if (signal?.aborted === true || isAbortError(err)) {
                throw err;
            }
            return fetchFailed(rest, url, `${where} failed: ${fetchErrorText(url, err)}`, null, err);
        }
        if (!response.ok) {
            await response.body?.cancel().catch(() => undefined);
            const status = `${String(response.status)} ${response.statusText}`.trim();
            return fetchFailed(rest, url, `${where} failed: ${status}`, response.status, null);
        }
        return this.importGraph(response.body ?? new Uint8Array(0), {
            ...rest,
            filename: rest.filename ?? urlFilename(url),
            mimeType: rest.mimeType ?? response.headers.get("content-type"),
        });
    }

    /**
     * Load a graph from a File or Blob; see the top-level loadFromFile() for the full description.
     * @param file - the File or Blob to read
     * @param options - the same options as importGraph()
     * @returns the graph, the format it was read as, and the import report
     */
    loadFromFile(file: Blob, options: ImportGraphOptions | CommonImportOptions = {}): Promise<ImportGraphResult> {
        const opts = options as ImportGraphOptions;
        const { name } = file as { name?: unknown };
        return this.importGraph(file.stream(), {
            ...opts,
            filename: opts.filename ?? (typeof name === "string" ? name : null),
            mimeType: opts.mimeType ?? (file.type === "" ? null : file.type),
        });
    }

    /**
     * Read every graph of an input (a DOT file with several graphs, a Pajek project with several
     * networks, a JGF document with a `graphs` array), each as its own snapshot. A format that holds
     * one graph per file gives one result. Options and detection are those of importGraph().
     * @param input - the text, bytes, stream or chunks to read
     * @param options - the format, hints, common and format-specific import options
     * @returns one result per graph, in document order
     */
    async importAllGraphs(input: ImportInput, options: ImportGraphOptions | CommonImportOptions = {}): Promise<ImportGraphResult[]> {
        const opts = options as ImportGraphOptions;
        return this.readAll(await this.choose(input, opts), opts);
    }

    /**
     * Read every graph of an input with the chosen importer.
     * @param chosen - the importer and the input to hand it
     * @param options - the importGraph options
     * @returns one result per graph, in document order
     */
    private async readAll(chosen: ChosenImporter, options: ImportGraphOptions): Promise<ImportGraphResult[]> {
        const { importer } = chosen;
        const builders: GraphBuilder[] = [];
        let reports: ImportReport[];
        try {
            if (importer.importAll === undefined) {
                builders.push(seededBuilder(options, importer.format));
                reports = [await importer.import(chosen.source, builders[0], importerOptions(options))];
            } else {
                reports = await importer.importAll(
                    chosen.source,
                    () => {
                        const builder = seededBuilder(options, importer.format);
                        builders.push(builder);
                        return builder;
                    },
                    importerOptions(options),
                );
            }
        } catch (err) {
            await chosen.peeked?.close();
            throw inGraph(chosen.sniff === null ? notReadableAs(err, importer.format, options.filename) : err, builders.length - 1);
        }
        return reports.map((report, i) => {
            try {
                return result(chosen, builders[i], report, options);
            } catch (err) {
                throw inGraph(err, i);
            }
        });
    }

    /**
     * The graphs of an input that can hold several, without importing them (a Cytoscape session's
     * networks, a JGF `graphs` array), so a caller can offer a choice and then pass `graphIndex`
     * or `graphName` to importGraph(). The format is named or sniffed as by importGraph().
     * @param input - the text, bytes, stream or chunks to read
     * @param options - the format, hints, common and format-specific import options
     * @returns one listing per graph, in document order; null when the format's importer does not
     * list its graphs (importGraph() then reads the first)
     */
    async listGraphs(input: ImportInput, options: ImportGraphOptions | CommonImportOptions = {}): Promise<readonly GraphListing[] | null> {
        const opts = options as ImportGraphOptions;
        const chosen = await this.choose(input, opts);
        try {
            return chosen.importer.listGraphs === undefined
                ? null
                : await chosen.importer.listGraphs(chosen.source, importerOptions(opts));
        } finally {
            await chosen.peeked?.close();
        }
    }

    /**
     * The importer for an input: the named format, or the sniffed one.
     * @param rawInput - the input as the caller passed it
     * @param options - the importGraph options
     * @returns the importer, the sniff, and the input to read (replayed for a stream)
     */
    private async choose(rawInput: ImportInput, options: ImportGraphOptions): Promise<ChosenImporter> {
        const input = normalizeInput(rawInput);
        const requested = options.format ?? "auto";
        if (requested !== "auto") {
            return { importer: this.importer(requested), sniff: null, source: input, peeked: null, warnings: [] };
        }
        // the options are checked before the input is touched, so a bad option never leaves a
        // peeked stream locked; the importer resolves them again with its own defaults
        const common = resolveImportOptions(options, { ids: "keep", defaultDirected: true, weightFrom: null });
        maxEmptyCellsOption(options.maxEmptyCells);
        const peeked = await peekHead(input, SNIFF_HEAD_BYTES, common.signal);
        // the head is sniffed as the importer will read it: in the caller's encoding when given
        const head =
            common.encoding !== null && peeked.head instanceof Uint8Array
                ? new TextDecoder(common.encoding).decode(peeked.head, { stream: true })
                : peeked.head;
        let sniff: SniffResult | null;
        const failures = new ImportReportBuilder("unknown", 0);
        const warnings: ImportIssue[] = [];
        try {
            const hints = { filename: options.filename, mimeType: options.mimeType, head };
            const ranked = rankFormats(hints, this.importerMap.values(), (format, err) => {
                warnings.push(
                    failures.warning(
                        "unsupported",
                        SNIFF_FAILED_CODE,
                        `the ${format} importer's sniff() threw (${messageOf(err)}); it was treated as not recognizing the input`,
                        { element: format },
                    ),
                );
            });
            sniff = ranked.length > 0 ? ranked[0] : null;
        } catch (err) {
            await peeked.close();
            throw err;
        }
        // a known non-graph file is refused whatever its name says, unless an importer claims its
        // content (a Cytoscape session is a zip); an HTML page always (the XML sniffers would
        // otherwise claim it by its markup)
        const foreign = foreignKind(peeked.head);
        const claimed = sniff !== null && sniff.content > 0 && !(foreign?.startsWith("an HTML") ?? false);
        if (sniff === null || (foreign !== null && !claimed)) {
            await peeked.close();
            const what = foreign === null ? "" : `: it is ${foreign}`;
            return failures.fail(
                UNKNOWN_FORMAT_CODE,
                `the input is not in a graph format graph-io recognizes${describeHints(options)}${what}; if you know its format, pass it as the format option`,
                undefined,
                { formats: this.formats() },
            );
        }
        return { importer: this.importer(sniff.format), sniff, source: peeked.input, peeked, warnings };
    }

    /**
     * Write a snapshot in a format, as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param format - the format name
     * @param options - the exporter's common and format-specific options
     * @returns the encoded chunks
     */
    exportGraph(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions | CommonExportOptions): AsyncIterable<Uint8Array> {
        return this.exporter(format).export(snapshot, options);
    }

    /**
     * Write a snapshot in a format, as one string.
     * @param snapshot - the snapshot
     * @param format - the format name
     * @param options - the exporter's common and format-specific options
     * @returns the whole document
     */
    async exportGraphToString(
        snapshot: GraphSnapshot,
        format: FormatName,
        options?: ExportGraphOptions | CommonExportOptions,
    ): Promise<string> {
        return this.exporter(format).exportToString(snapshot, options);
    }

    /**
     * Write a snapshot in a format as one buffer of UTF-8 bytes; see the top-level
     * exportGraphToBytes().
     * @param snapshot - the graph to write
     * @param format - a format name where `canExport` is true
     * @param options - sanitizeIds, onMixedDirection and the format's own options
     * @returns the encoded file
     */
    exportGraphToBytes(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions | CommonExportOptions): Promise<Uint8Array> {
        return collectBytes(this.exportGraph(snapshot, format, options));
    }

    /**
     * Write a snapshot in a format as a Blob typed with the format's first MIME type; see the
     * top-level exportGraphToBlob().
     * @param snapshot - the graph to write
     * @param format - a format name where `canExport` is true
     * @param options - sanitizeIds, onMixedDirection and the format's own options
     * @returns the file as a Blob
     */
    async exportGraphToBlob(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions | CommonExportOptions): Promise<Blob> {
        const parts: Uint8Array[] = [];
        for await (const chunk of this.exportGraph(snapshot, format, options)) {
            parts.push(chunk);
        }
        const info = this.listFormats().find((f) => f.format === format);
        return new Blob(parts as BlobPart[], { type: info?.mimeTypes[0] ?? "application/octet-stream" });
    }

    /**
     * What exporting a snapshot in a format would lose, without writing anything.
     * @param snapshot - the snapshot
     * @param format - the format name
     * @param options - the exporter's common and format-specific options
     * @returns the loss notes, empty when the export is exact
     */
    checkExport(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions | CommonExportOptions): readonly LossNote[] {
        return this.exporter(format).check(snapshot, options);
    }

    /**
     * Browser only: write a graph in a format and have the browser save it as a file; see the
     * top-level downloadGraph(). Use this method on a registry from createRegistry() to download
     * without bundling every built-in format.
     * @param snapshot - the graph to write
     * @param format - a format name from listFormats() where `canExport` is true
     * @param options - the export options, plus `filename`
     * @returns resolves once the download has been handed to the browser
     */
    async downloadGraph(
        snapshot: GraphSnapshot,
        format: FormatName,
        options: DownloadGraphOptions | CommonExportOptions = {},
    ): Promise<void> {
        if (typeof document === "undefined") {
            throw new GraphFormatError(
                "E_UNSUPPORTED",
                "downloadGraph() needs a browser document; use exportGraphToBytes() and write the bytes yourself",
            );
        }
        const { filename, ...rest } = options as DownloadGraphOptions;
        const blob = await this.exportGraphToBlob(snapshot, format, rest);
        const extension = this.listFormats().find((f) => f.format === format)?.extensions[0] ?? `.${format}`;
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = filename ?? `graph${extension}`;
        anchor.click();
        // Safari cancels the download when the URL is revoked in the same task
        setTimeout(() => {
            URL.revokeObjectURL(href);
        }, 0);
    }

    /**
     * Every format this registry can read or write, in registration order; see the top-level
     * listFormats().
     * @returns one entry per format
     */
    listFormats(): readonly FormatInfo[] {
        return this.formats().map((format) => {
            const importer = this.importerMap.get(format);
            const exporter = this.exporterMap.get(format);
            return Object.freeze({
                format,
                extensions: importer?.extensions ?? exporter?.extensions ?? [],
                mimeTypes: importer?.mimeTypes ?? exporter?.mimeTypes ?? [],
                canImport: importer !== undefined,
                canExport: exporter !== undefined,
                capabilities: exporter?.capabilities ?? null,
            });
        });
    }
}

/**
 * A new registry holding every built-in importer and exporter, in the order of GRAPH_FORMATS.
 * @returns a new registry
 * @category Formats and detection
 */
export function createRegistry(): FormatRegistry {
    return new FormatRegistry()
        .registerImporter(jsonImporter)
        .registerExporter(jsonExporter)
        .registerImporter(graphmlImporter)
        .registerExporter(graphmlExporter)
        .registerImporter(gexfImporter)
        .registerExporter(gexfExporter)
        .registerImporter(csvImporter)
        .registerExporter(csvExporter)
        .registerImporter(gmlImporter)
        .registerExporter(gmlExporter)
        .registerImporter(dotImporter)
        .registerExporter(dotExporter)
        .registerImporter(pajekImporter)
        .registerExporter(pajekExporter)
        .registerImporter(neo4jImporter)
        .registerExporter(neo4jExporter)
        .registerImporter(xgmmlImporter)
        .registerExporter(xgmmlExporter)
        .registerImporter(cx2Importer)
        .registerExporter(cx2Exporter)
        .registerImporter(cxImporter)
        .registerExporter(cxExporter)
        .registerImporter(oboImporter)
        .registerExporter(oboExporter)
        .registerImporter(cysImporter)
        .registerExporter(cysExporter);
}

/**
 * The default registry: every built-in format.
 * @category Formats and detection
 */
export const registry: FormatRegistry = /* @__PURE__ */ createRegistry();

/**
 * Read a graph from a string, bytes or a stream. The format is the one you name in `format`, else
 * it is detected from `filename`, `mimeType` and the first bytes; an input that matches no format
 * fails with E_UNKNOWN_FORMAT. From a file that holds several graphs it reads the one `graphIndex`
 * or `graphName` chooses, else the first, with a W_MULTIPLE_GRAPHS warning. For a File or Blob use
 * loadFromFile(), for a URL loadFromUrl().
 * @param input - the whole text, the bytes (a Uint8Array or a Node Buffer), a ReadableStream of
 *   bytes, or an async iterable of text or byte chunks (a Node read stream)
 * @param options - the format, format hints, the options every importer takes and the format's own
 *   options
 * @returns the graph (`snapshot`), the format it was read as, and the import report
 * @throws ImportError when the input could not be read; `err.issue?.code` says why
 * @throws GraphFormatError with code E_UNSUPPORTED for a `format` no importer is registered for, or
 *   an option value that is not allowed (`err.details.option` names it)
 * @throws the signal's reason when `signal` aborts
 * @category Loading
 */
export function importGraph(input: ImportInput, options?: ImportGraphOptions | CommonImportOptions): Promise<ImportGraphResult> {
    return registry.importGraph(input, options);
}

/**
 * Read every graph of a file that can hold several (DOT, GML, a Pajek project, a JSON Graph Format
 * or OBO Graphs document, CX, XGMML, a Cytoscape session). A format that holds one graph per file
 * gives one result. Options and errors are the same as importGraph()'s.
 * @param input - the text, bytes or stream to read
 * @param options - the same options as importGraph()
 * @returns one result per graph, in file order
 * @category Loading
 */
export function importAllGraphs(input: ImportInput, options?: ImportGraphOptions | CommonImportOptions): Promise<ImportGraphResult[]> {
    return registry.importAllGraphs(input, options);
}

/**
 * List the graphs of a file without reading them: each one's `index`, `name`, and node and edge
 * counts when the file states them. Pass the index or name to importGraph() as `graphIndex` or
 * `graphName`. The counts come from the file and can differ from what an import reads, for example
 * when the import adds edges the listing does not count. JSON, CX, XGMML and Cytoscape sessions can
 * list their graphs; for DOT, GML and Pajek it returns null, and importAllGraphs() is the way to see
 * them.
 * @param input - the text, bytes or stream to read
 * @param options - the same options as importGraph()
 * @returns one listing per graph, in file order; null when the format cannot list its graphs
 * @category Loading
 */
export function listGraphs(input: ImportInput, options?: ImportGraphOptions | CommonImportOptions): Promise<readonly GraphListing[] | null> {
    return registry.listGraphs(input, options);
}

/**
 * Write a graph in a format as a stream of UTF-8 byte chunks, for a graph too large to hold as one
 * file in memory. In Node, pipe it to a file with `pipeline(exportGraph(...), createWriteStream(path))`.
 * Options and errors are the same as exportGraphToBytes()'s.
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - sanitizeIds, onMixedDirection and the format's own options
 * @returns the file's bytes, chunk by chunk
 * @category Saving
 */
export function exportGraph(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions | CommonExportOptions,
): AsyncIterable<Uint8Array> {
    return registry.exportGraph(snapshot, format, options);
}

/**
 * Write a graph in a format and return the file as one string. A binary format (a Cytoscape
 * session) cannot be a string and fails with E_UNSUPPORTED; use exportGraphToBytes() for it. Options
 * and errors are the same as exportGraphToBytes()'s.
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - sanitizeIds, onMixedDirection and the format's own options
 * @returns the whole file
 * @category Saving
 */
export async function exportGraphToString(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions | CommonExportOptions,
): Promise<string> {
    return registry.exportGraphToString(snapshot, format, options);
}

/**
 * What saving a graph in a format would lose, without writing anything. Pass the same options you
 * will pass to the save. Each note has a stable `code`: "E_" means the save would throw, "W_" means
 * the file is written but that part does not read back the same. An empty array means the file
 * reads back as the same graph. Runs synchronously.
 * @param snapshot - the graph to check
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - the options you will save with
 * @returns the loss notes, empty when the save is exact
 * @throws GraphFormatError with code E_UNSUPPORTED when no exporter is registered for `format`, or
 *   when an option value is not allowed (`err.details.option` names it)
 * @category Saving
 */
export function checkExport(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions | CommonExportOptions,
): readonly LossNote[] {
    return registry.checkExport(snapshot, format, options);
}

/**
 * Fetch a graph file from a URL and load it. The file is streamed into the importer as it
 * downloads, so a large file is not held in memory twice. When you do not name a `format`, it is
 * worked out from the URL's file name, the response's Content-Type and the first bytes of the
 * file. Your own `filename` or `mimeType` option takes the place of the hint from the URL or the
 * response. Every other option goes to importGraph() unchanged, including format-specific ones
 * such as `delimiter` or `dialect`, and `graphIndex` / `graphName` for files that hold several
 * graphs. The result is the same as importGraph()'s. A successful load can still have skipped
 * elements; check `report.errorCount` and `report.warningCount`, or pass `errorLimit: 0` to make
 * the first error fatal. Works wherever fetch exists: browsers, Node 18 and later, Deno, Bun and
 * workers.
 * @param url - an absolute URL, or in a browser one relative to the page
 * @param options - import options, plus `request` for fetch
 * @returns the graph, the format it was read as, and the import report
 * @throws ImportError when the file could not be loaded; `err.issue?.code` is "E_FETCH" for a
 *   network failure, a CORS refusal or a status outside 200-299 (`err.details.url`,
 *   `err.details.status` -- null for a network failure -- and `err.details.cause`, fetch's own
 *   error), "E_UNKNOWN_FORMAT" when no format recognizes the file (pass `format`), or the code of
 *   the parse error
 * @throws GraphFormatError with code E_UNSUPPORTED when `format` names no registered importer
 * @throws the signal's reason when `signal` aborts
 * @example
 * ```ts
 * import { GraphFormatError, loadFromUrl } from "@graphty/graph-io";
 *
 * try {
 *     const { snapshot, format } = await loadFromUrl("https://example.com/data/karate.gml");
 *     console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
 * } catch (err) {
 *     if (err instanceof GraphFormatError) {
 *         console.error(err.message);
 *     } else {
 *         throw err;
 *     }
 * }
 * ```
 * @category Loading
 */
export function loadFromUrl(url: string | URL, options?: LoadFromUrlOptions | CommonImportOptions): Promise<ImportGraphResult> {
    return registry.loadFromUrl(url, options);
}

/**
 * Load a graph from a File or Blob: a file the user picked in an `<input type="file">`, a file
 * dropped on the page, a Blob you built, or in Node a Blob from `fs.openAsBlob(path)`. The content
 * is streamed into the importer. A File's `name` and the Blob's `type` are used as format hints
 * unless you pass `filename` or `mimeType` yourself. Options, result and errors are the same as
 * loadFromUrl()'s, without E_FETCH.
 * @param file - the File or Blob to read
 * @param options - the same options as importGraph()
 * @returns the graph, the format it was read as, and the import report
 * @throws ImportError when the file could not be loaded (`err.issue?.code` E_UNKNOWN_FORMAT or a parse error)
 * @throws GraphFormatError with code E_UNSUPPORTED when `format` names no registered importer
 * @throws the signal's reason when `signal` aborts
 * @example
 * ```ts
 * input.addEventListener("change", async () => {
 *     const file = input.files?.[0];
 *     if (file) {
 *         const { snapshot, report } = await loadFromFile(file);
 *         console.log(`${snapshot.nodeCount} nodes, ${report.errorCount} skipped`);
 *     }
 * });
 * ```
 * @category Loading
 */
export function loadFromFile(file: Blob, options?: ImportGraphOptions | CommonImportOptions): Promise<ImportGraphResult> {
    return registry.loadFromFile(file, options);
}

/**
 * Write a graph in a format and return the whole file as UTF-8 bytes, ready for fs.writeFile, a
 * fetch body or a zip entry. Prefer this over exportGraphToString() when the result goes to a file
 * or the network. To stream a very large graph, use exportGraph(). To find out beforehand what the
 * file will not keep, call checkExport() with the same format and the same options object: every
 * "E_" note it returns makes this call throw, and every "W_" note describes a loss this call
 * accepts. Most "E_" notes go away with `sanitizeIds: "mangle"` (rewrite ids the format cannot
 * hold) or `onMixedDirection: "directed"` / `"undirected"`. The format's own options (the CSV
 * `table` and `dialect`, the GEXF `version`, ...) go in the same object.
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - sanitizeIds, onMixedDirection and the format's own options
 * @returns the encoded file
 * @throws GraphFormatError with code E_UNSUPPORTED when no exporter is registered for `format`
 * @throws GraphFormatError when the graph cannot be written in this format under these options
 *   (checkExport() returns an "E_" note for the same call). The thrown code names the kind of
 *   failure rather than the note: E_INVALID_ID for ids (the E_ID_CHARSET and E_ID_TEXT_COLLISION
 *   notes), E_DIRECTED for direction (E_MIXED_DIRECTION), and E_COLUMN_TYPE or E_UNSUPPORTED for a
 *   value the format cannot write; each note's entry on the codes page says which
 * @throws GraphFormatError with code E_UNSUPPORTED for an option value that is not allowed
 *   (`err.details.option` names it)
 * @example
 * ```ts
 * import { writeFile } from "node:fs/promises";
 *
 * await writeFile("out.gexf", await exportGraphToBytes(snapshot, "gexf"));
 * ```
 * @category Saving
 */
export function exportGraphToBytes(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions | CommonExportOptions,
): Promise<Uint8Array> {
    return registry.exportGraphToBytes(snapshot, format, options);
}

/**
 * Write a graph in a format and return it as a Blob, for uploading with fetch or FormData or for
 * offering as a download. The Blob's `type` is the first entry of the format's `mimeTypes` in
 * listFormats(), or application/octet-stream when the format lists none. The exporter's chunks
 * are kept as they are and never joined into one string. Options and errors are the same as
 * exportGraphToBytes().
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - sanitizeIds, onMixedDirection and the format's own options
 * @returns the file as a Blob
 * @throws the same errors as exportGraphToBytes()
 * @example
 * ```ts
 * const body = new FormData();
 * body.append("file", await exportGraphToBlob(snapshot, "graphml"), "graph.graphml");
 * await fetch("/api/graphs", { method: "POST", body });
 * ```
 * @category Saving
 */
export function exportGraphToBlob(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions | CommonExportOptions,
): Promise<Blob> {
    return registry.exportGraphToBlob(snapshot, format, options);
}

/**
 * Browser only: write a graph in a format and have the browser save it as a file, the same as
 * clicking a download link. Call it from a click handler; awaiting other work first is fine. The
 * promise resolves once the file has been handed to the browser. There is no way to learn
 * whether the user then canceled the save. Calling it where there is no `document` (Node, a
 * worker) throws instead of silently doing nothing; importing it is safe everywhere. Formats you
 * registered with `registry.registerExporter()` can be downloaded too.
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - the export options, plus `filename`
 * @returns resolves once the download has been handed to the browser
 * @throws GraphFormatError with code E_UNSUPPORTED when called without a DOM `document`
 * @throws the same errors as exportGraphToBytes()
 * @example
 * ```ts
 * saveButton.addEventListener("click", () => {
 *     void downloadGraph(snapshot, "graphml", { filename: "network.graphml" });
 * });
 * ```
 * @category Saving
 */
export async function downloadGraph(
    snapshot: GraphSnapshot,
    format: FormatName,
    options: DownloadGraphOptions | CommonExportOptions = {},
): Promise<void> {
    return registry.downloadGraph(snapshot, format, options);
}

/**
 * Every format the default registry can read or write, including any you registered yourself:
 * the built-in formats in the order of GRAPH_FORMATS (the order format detection prefers them),
 * then yours in registration order. Use it to fill a "Save as" menu (the entries with
 * `canExport`), a file input's `accept` attribute (the `extensions` of the entries with
 * `canImport`), or to pick the output format from a file name.
 * @returns one entry per format
 * @example
 * ```ts
 * input.accept = listFormats().filter((f) => f.canImport).flatMap((f) => f.extensions).join(",");
 * const target = listFormats().find((f) => f.canExport && f.extensions.includes(extensionOf(path) ?? ""));
 * ```
 * @category Formats and detection
 */
export function listFormats(): readonly FormatInfo[] {
    return registry.listFormats();
}

/**
 * Detect a file's format without reading it, from what you know about it: a `filename` (only the
 * extension counts), a `mimeType`, and `head`, the file's first bytes or characters (up to
 * SNIFF_HEAD_BYTES; pass `bytes.subarray(0, SNIFF_HEAD_BYTES)`). It uses every format of the default
 * registry, including the ones you registered. For every candidate, best first, call
 * `registry.sniffAll(hints)`.
 * @param hints - `{ filename, mimeType, head }`, any of them
 * @returns the best candidate (`format`, `confidence` and what matched), or null when no format
 *   claims the input
 * @example
 * ```ts
 * sniff({ filename: "graph.xml", head: "<?xml version=\"1.0\"?><gexf" })?.format; // "gexf"
 * ```
 * @category Formats and detection
 */
export function sniff(hints: SniffHints): SniffResult | null {
    return registry.sniff(hints);
}

/**
 * Abort a loadFromUrl() whose fetch failed with an E_FETCH ImportError.
 * @param options - the import options (for the format name on the report)
 * @param url - the URL
 * @param message - the message
 * @param status - the HTTP status, or null for a network failure
 * @param cause - fetch's own error, or null
 * @returns never; always throws
 */
function fetchFailed(
    options: ImportGraphOptions,
    url: string | URL,
    message: string,
    status: number | null,
    cause: unknown,
): never {
    const format = options.format === undefined || options.format === "auto" ? "unknown" : options.format;
    return new ImportReportBuilder(format, 0).fail(FETCH_CODE, message, undefined, { url: String(url), status, cause });
}

/**
 * The error for an input refused by the format the caller named before any element was read: the
 * parser's message ("line 1: text outside the root element") prefixed with the file and the format,
 * since the likely cause is a file of another kind, not a damaged one.
 * @param err - what the importer threw
 * @param format - the format named in `format`
 * @param filename - the file name hint, if any
 * @returns the error to throw
 */
function notReadableAs(err: unknown, format: string, filename: string | null | undefined): unknown {
    if (
        !(err instanceof ImportError) ||
        err.issue?.category !== "parse-error" ||
        err.report.errorCount > 1 ||
        err.report.counts.nodes + err.report.counts.edges > 0
    ) {
        return err;
    }
    const what = filename === undefined || filename === null ? "the input" : JSON.stringify(filename);
    return new ImportError(`${what} could not be read as ${format}: ${err.message}`, err.report, err.details);
}

/**
 * Why fetch() rejected, in words that point at the fix: a relative URL with no page to resolve it
 * against (Node), a file: URL fetch() does not read, or a network error, which in a browser
 * includes a CORS refusal.
 * @param url - the URL as given
 * @param err - what fetch() threw
 * @returns the reason
 */
function fetchErrorText(url: string | URL, err: unknown): string {
    let absolute: URL | null = null;
    try {
        absolute = new URL(url);
    } catch {
        // relative: resolvable only against a page's location
    }
    if (absolute === null && (globalThis as { location?: unknown }).location === undefined) {
        return "a relative URL needs a web page to resolve against; outside a browser pass an absolute http(s) URL, or read a local file with loadFromFile() or importGraph()";
    }
    if (absolute?.protocol === "file:") {
        return "fetch() cannot read file: URLs here; read a local file with loadFromFile() or importGraph()";
    }
    const cause = (err as { cause?: { message?: unknown } } | null)?.cause?.message;
    const detail = typeof cause === "string" && cause !== "" ? ` (${cause})` : "";
    return `the server could not be reached, or (in a browser) it does not allow this page to read the file (CORS)${detail}`;
}

/**
 * The last path segment of a URL, as a format hint.
 * @param url - the URL, absolute or relative
 * @returns the file name, or null when the path ends in "/"
 */
function urlFilename(url: string | URL): string | null {
    const path = new URL(url, "http://localhost/").pathname;
    const name = path.slice(path.lastIndexOf("/") + 1);
    return name === "" ? null : name;
}

/**
 * The options handed to the importer: everything but the registry's own keys.
 * @param options - the importGraph options
 * @returns the importer's options
 */
function importerOptions(options: ImportGraphOptions): CommonImportOptions {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options)) {
        if (!REGISTRY_KEYS.has(key)) {
            out[key] = value;
        }
    }
    return out;
}

/** The importer chosen for an input, and the input to hand it. */
interface ChosenImporter {
    /** The importer. */
    readonly importer: GraphImporter;
    /** The sniff that chose it, or null when the caller named the format. */
    readonly sniff: SniffResult | null;
    /** The input to read: the original, or a replaying iterable for a peeked stream. */
    readonly source: ImportInput;
    /** The peeked head of a sniffed input, or null. */
    readonly peeked: PeekedInput | null;
    /** W_SNIFF_FAILED warnings for the import report, one per importer whose sniff() threw. */
    readonly warnings: readonly ImportIssue[];
}

/**
 * A fresh builder seeded from the common options, `directed: true` as a placeholder the importer
 * overrides from the file, that stops the import when its attributes get too sparse.
 * @param options - the importGraph options
 * @param format - the format being read
 * @returns the builder
 */
function seededBuilder(options: ImportGraphOptions, format: string): GraphBuilder {
    const maxEmptyCells = maxEmptyCellsOption(options.maxEmptyCells);
    try {
        return newBuilder(options, format, maxEmptyCells);
    } catch (err) {
        // the builder names a bad value by its field; report it as the option the caller passed
        if (err instanceof GraphFormatError && err.code === "E_UNSUPPORTED" && typeof err.details.field === "string") {
            const option = err.details.field;
            throw new GraphFormatError(
                "E_UNSUPPORTED",
                `option ${option}: ${JSON.stringify(err.details.found)} is not one of the values it takes`,
                { option, found: err.details.found },
            );
        }
        throw err;
    }
}

/**
 * The builder of seededBuilder(), before its option errors are reworded.
 * @param options - the importGraph options
 * @param format - the format being read
 * @param maxEmptyCells - the empty-cell budget
 * @returns the builder
 */
function newBuilder(options: ImportGraphOptions, format: string, maxEmptyCells: number): GraphBuilder {
    return new CellBudgetBuilder(
        {
            weightDtype: options.weightDtype ?? "f64",
            ...options.builder,
            directed: true,
            addMissingNodes: options.addMissingNodes ?? true,
            duplicateEdges: options.duplicateEdges ?? "keep",
            selfLoops: options.selfLoops ?? "keep",
        },
        format,
        maxEmptyCells,
    );
}

/**
 * Name the graph an importAllGraphs() failure belongs to: the report is that graph's own, so the
 * message is prefixed with its index and `details.graphIndex` set, for every graph including the
 * first. Anything other than an ImportError raised while a graph was being read passes unchanged.
 * @param err - the error thrown while reading or freezing a graph
 * @param index - the index of that graph, -1 before the first graph began
 * @returns the error to throw
 */
function inGraph(err: unknown, index: number): unknown {
    if (!(err instanceof ImportError) || index < 0) {
        return err;
    }
    return new ImportError(`graph ${index}: ${err.message}`, err.report, { ...err.details, graphIndex: index });
}

/**
 * Freeze an imported builder into an importGraph result.
 * @param chosen - the importer and its sniff
 * @param builder - the filled builder
 * @param report - the importer's report
 * @param options - the importGraph options
 * @returns the frozen result
 */
function result(
    chosen: ChosenImporter,
    builder: GraphBuilder,
    report: ImportReport,
    options: ImportGraphOptions,
): ImportGraphResult {
    let frozen: ReturnType<GraphBuilder["freezeWithReport"]>;
    try {
        frozen = builder.freezeWithReport(options.freeze);
    } catch (err) {
        throw freezeFailure(err, report);
    }
    const { warnings } = chosen;
    return Object.freeze({
        format: chosen.importer.format,
        sniff: chosen.sniff,
        snapshot: frozen.snapshot,
        report: withFreezeWarnings(
            warnings.length === 0
                ? report
                : Object.freeze({
                      ...report,
                      issues: Object.freeze([...warnings, ...report.issues]),
                      warningCount: report.warningCount + warnings.length,
                  }),
            frozen.report,
        ),
        freeze: frozen.report,
    });
}

/**
 * The import report with what the builder's policies changed while the graph was built: one
 * W_EDGES_MERGED warning when `duplicateEdges` merged parallel edges (whatever told them apart, a
 * relation or a label, is lost) and one W_SELF_LOOPS_DROPPED warning when `selfLoops: "drop"`
 * removed self-loops, so nothing the caller's options removed goes unreported.
 * @param report - the import's report
 * @param freeze - the freeze report
 * @returns the report, with the warnings added
 */
function withFreezeWarnings(report: ImportReport, freeze: FreezeReport): ImportReport {
    const added: ImportIssue[] = [];
    const warn = (category: IssueCategory, code: string, message: string): void => {
        added.push(Object.freeze({ category, severity: "warning" as const, code, message, line: null, element: null }));
    };
    if (freeze.mergedEdges > 0) {
        warn(
            "merged",
            EDGES_MERGED_CODE,
            `${freeze.mergedEdges} parallel edge${plural(freeze.mergedEdges)} ${agree(freeze.mergedEdges, "was", "were")} merged into one edge per pair by the duplicateEdges policy; whatever told them apart (a relation, a label) is lost`,
        );
    }
    if (freeze.droppedSelfLoops > 0) {
        warn(
            "validation-error",
            SELF_LOOPS_DROPPED_CODE,
            `${freeze.droppedSelfLoops} self-loop${plural(freeze.droppedSelfLoops)} ${agree(freeze.droppedSelfLoops, "was", "were")} removed by selfLoops: "drop"`,
        );
    }
    if (added.length === 0) {
        return report;
    }
    return Object.freeze({
        ...report,
        issues: Object.freeze([...report.issues, ...added]),
        warningCount: report.warningCount + added.length,
    });
}

/**
 * The ImportError of a freeze the builder refused (a `duplicateEdges: "error"` or `selfLoops:
 * "error"` policy meeting a duplicate edge or a self-loop the file holds): the builder's code
 * recorded as an error issue on the import's report, so the caller gets the report and the file's
 * defect rather than a bare GraphFormatError.
 * @param err - what freezeWithReport() threw
 * @param report - the import's report
 * @returns the error to throw (anything that is not a GraphFormatError, unchanged)
 */
function freezeFailure(err: unknown, report: ImportReport): unknown {
    if (!(err instanceof GraphFormatError) || err instanceof ImportError) {
        return err;
    }
    const issue = Object.freeze({
        category: "validation-error" as const,
        severity: "error" as const,
        code: err.code,
        message: err.message,
        line: null,
        element: null,
    });
    const failed: ImportReport = Object.freeze({
        ...report,
        issues: Object.freeze([...report.issues, issue]),
        errorCount: report.errorCount + 1,
    });
    return new ImportError(`the graph cannot be frozen: ${err.message}`, failed, { code: err.code, ...err.details });
}

/**
 * The E_UNSUPPORTED error of a format name nothing is registered under.
 * @param kind - importer or exporter
 * @param format - the requested name
 * @param known - the registered names
 * @returns the error
 */
function unknownFormat(kind: "importer" | "exporter", format: string, known: Iterable<string>): GraphFormatError {
    const supported = [...known];
    return new GraphFormatError(
        "E_UNSUPPORTED",
        `no ${kind} is registered for format ${JSON.stringify(format)}; known: ${supported.join(", ")}`,
        { option: "format", found: format, supported },
    );
}

/**
 * The hints of an import, for the unknown-format message.
 * @param options - the importGraph options
 * @returns " (filename ..., MIME type ...)" or an empty string
 */
function describeHints(options: ImportGraphOptions): string {
    const parts: string[] = [];
    if (typeof options.filename === "string" && options.filename.length > 0) {
        parts.push(`filename ${JSON.stringify(options.filename)}`);
    }
    if (typeof options.mimeType === "string" && options.mimeType.length > 0) {
        parts.push(`MIME type ${JSON.stringify(options.mimeType)}`);
    }
    return parts.length === 0 ? "" : ` (${parts.join(", ")})`;
}

/** A head read from an input, and the input to hand the importer (the same bytes, replayed for a stream). */
interface PeekedInput {
    /** The first bytes (or, for a text input, characters) of the content. */
    readonly head: Uint8Array | string;
    /** The input to read: the original for in-memory input, a replaying iterable for a stream. */
    readonly input: ImportInput;
    /**
     * Close the source when the importer never iterated the replaying input (it threw first, an
     * abort for instance): a stream's reader is canceled and released, an async generator finalised.
     * @returns when the source is closed
     */
    close(): Promise<void>;
}

/**
 * The first `bytes` of an input without consuming it: in-memory input is sliced; a stream or an
 * async iterable is read until enough is buffered and then replayed (the buffered chunks first,
 * the rest as it arrives) through a new async iterable that cancels the source when the importer
 * stops early.
 * @param input - the input
 * @param bytes - how much to peek
 * @param signal - the cancellation signal, or null
 * @returns the head and the input to read
 */
async function peekHead(input: ImportInput, bytes: number, signal: AbortSignal | null): Promise<PeekedInput> {
    if (typeof input === "string") {
        return { head: input.slice(0, bytes), input, close: (): Promise<void> => Promise.resolve() };
    }
    if (input instanceof Uint8Array) {
        return { head: input.subarray(0, bytes), input, close: (): Promise<void> => Promise.resolve() };
    }
    throwIfAborted(signal);
    const source: AsyncIterator<string | Uint8Array> =
        typeof (input as { getReader?: unknown }).getReader === "function"
            ? readerIterator(input as ReadableStream<Uint8Array>, signal)
            : (input as AsyncIterable<string | Uint8Array>)[Symbol.asyncIterator]();
    const buffered: (string | Uint8Array)[] = [];
    let size = 0;
    let finished = false;
    while (size < bytes) {
        if (signal !== null && signal.aborted) {
            await source.return?.();
            throwIfAborted(signal);
        }
        const next = await source.next();
        if (next.done === true) {
            finished = true;
            break;
        }
        buffered.push(next.value);
        size += typeof next.value === "string" ? next.value.length : next.value.byteLength;
    }
    if (!finished && signal !== null && signal.aborted) {
        // an abort that landed on the read completing the head: close the source before rethrowing
        await source.return?.();
        throwIfAborted(signal);
    }
    const replayed = replay(buffered, source, finished);
    return { head: joinHead(buffered, bytes), input: replayed, close: (): Promise<void> => replayed.close() };
}

/**
 * The head text or bytes of the buffered chunks: bytes when every chunk is bytes, text otherwise
 * (byte chunks decoded leniently; the importer decodes the real input strictly).
 * @param chunks - the buffered chunks
 * @param bytes - the head size
 * @returns the head
 */
function joinHead(chunks: readonly (string | Uint8Array)[], bytes: number): Uint8Array | string {
    if (chunks.every((c) => c instanceof Uint8Array)) {
        const total = Math.min(
            bytes,
            chunks.reduce((sum, c) => sum + c.byteLength, 0),
        );
        const head = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            if (offset >= total) {
                break;
            }
            const part = chunk.subarray(0, Math.min(chunk.byteLength, total - offset));
            head.set(part, offset);
            offset += part.byteLength;
        }
        return head;
    }
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let text = "";
    for (const chunk of chunks) {
        text += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
        if (text.length >= bytes) {
            break;
        }
    }
    return text.slice(0, bytes);
}

/**
 * An async iterable that yields the buffered chunks, then the rest of the source; the source is
 * closed when the consumer stops early.
 * @param buffered - the chunks already read
 * @param source - the iterator positioned after them
 * @param finished - whether the source is already exhausted
 * @returns the replaying iterable
 */
function replay(
    buffered: readonly (string | Uint8Array)[],
    source: AsyncIterator<string | Uint8Array>,
    finished: boolean,
): AsyncIterable<string | Uint8Array> & { close(): Promise<void> } {
    let exhausted = finished;
    const close = async (): Promise<void> => {
        if (!exhausted) {
            exhausted = true;
            await source.return?.();
        }
    };
    return {
        close,
        [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array> {
            let position = 0;
            return {
                async next(): Promise<IteratorResult<string | Uint8Array>> {
                    if (position < buffered.length) {
                        return { done: false, value: buffered[position++] };
                    }
                    if (exhausted) {
                        return { done: true, value: undefined };
                    }
                    const next = await source.next();
                    if (next.done === true) {
                        exhausted = true;
                        return { done: true, value: undefined };
                    }
                    return next;
                },
                async return(): Promise<IteratorResult<string | Uint8Array>> {
                    await close();
                    return { done: true, value: undefined };
                },
            };
        },
    };
}

/**
 * An async iterator over a ReadableStream's chunks that cancels the stream (with the signal's
 * reason) when closed early or when the signal fires during a read, and releases the reader when
 * the stream ends or errors.
 * @param stream - the stream
 * @param signal - the cancellation signal, or null
 * @returns the iterator
 */
function readerIterator(stream: ReadableStream<Uint8Array>, signal: AbortSignal | null): AsyncIterator<Uint8Array> {
    const reader = lockReader(stream);
    let done = false;
    return {
        async next(): Promise<IteratorResult<Uint8Array>> {
            if (done) {
                return { done: true, value: undefined };
            }
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
                result = await abortable(reader.read(), signal);
            } catch (err) {
                done = true;
                await reader.cancel(signal?.reason).catch(() => undefined);
                reader.releaseLock();
                throw err;
            }
            if (result.done) {
                done = true;
                reader.releaseLock();
                return { done: true, value: undefined };
            }
            return { done: false, value: result.value };
        },
        async return(): Promise<IteratorResult<Uint8Array>> {
            if (!done) {
                done = true;
                await reader.cancel(signal?.reason).catch(() => undefined);
                reader.releaseLock();
            }
            return { done: true, value: undefined };
        },
    };
}
