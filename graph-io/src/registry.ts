/**
 * The importer / exporter registry (design sections 8.2 and 8.4): the eight built-in formats
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
import { EDGES_MERGED_CODE, FETCH_CODE } from "./common/codes.js";
import { abortable, foreignKind, lockReader, normalizeInput, throwIfAborted } from "./common/input.js";
import { resolveImportOptions } from "./common/options.js";
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
    type LossNote,
} from "./types.js";

/** The issue code of an input whose format no registered importer recognises. */
export const UNKNOWN_FORMAT_CODE = "E_UNKNOWN_FORMAT";

/**
 * The issue code of a registered importer whose sniff() threw while the format was being chosen;
 * that importer was treated as not recognising the input (a defect in that importer).
 */
export const SNIFF_FAILED_CODE = "W_SNIFF_FAILED";

/** The builder options importGraph() accepts beyond the ones the common import options seed. */
export type BuilderSeed = Omit<
    GraphBuilderOptions,
    "directed" | "addMissingNodes" | "duplicateEdges" | "selfLoops" | "weightDtype"
>;

/**
 * The options of importGraph(): the common import options (which also seed the registry's
 * builder, design section 8.4), the format choice and the hints sniffing uses, the builder and
 * freeze options, and any format-specific option (`delimiter`, `dialect`, ...) passed through to
 * the importer unchanged. `graphIndex` / `graphName` choose one graph of an input that holds
 * several, for the formats that list their graphs.
 */
export interface ImportGraphOptions extends CommonImportOptions, GraphChoiceOptions {
    /**
     * The format to read the input as ("graphml", "csv", ...), or "auto" (the default) to work it
     * out from `filename`, `mimeType` and the first bytes of the input.
     */
    readonly format?: FormatName | "auto" | undefined;
    /** The file name or full path the input came from; only its extension is used, as a format hint. */
    readonly filename?: string | null | undefined;
    /** The MIME type the input was served as, a hint for sniffing. */
    readonly mimeType?: string | null | undefined;
    /** Builder options the common options do not cover (`weighted`, `expectedNodes`, ...). */
    readonly builder?: BuilderSeed | undefined;
    /** Options of the freeze that follows the import. */
    readonly freeze?: FreezeOptions | undefined;
    /**
     * The most attribute slots that hold no value the import may allocate before it stops with
     * E_TOO_MANY_EMPTY_CELLS. Every attribute is a column with one slot per node (or edge), so a file
     * whose nodes each have a differently named attribute would otherwise need nodes x attributes
     * memory. Default 2^24 (16,777,216); Infinity turns the check off. Dense files are never stopped.
     */
    readonly maxEmptyCells?: number | undefined;
    /** Format-specific options, passed to the importer as they are. */
    readonly [formatOption: string]: unknown;
}

/** What importGraph(), loadFromUrl() and loadFromFile() return. */
export interface ImportGraphResult {
    /** The format the input was read as ("graphml", ...). */
    readonly format: string;
    /** How the format was detected, or null when you named it. Most callers can ignore it. */
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
    /** Statistics from the final build step. Most callers can ignore it. */
    readonly freeze: FreezeReport;
}

/**
 * Options for loadFromUrl(): everything importGraph() accepts, plus the fetch request settings.
 * @example
 * ```ts
 * await loadFromUrl("/api/graph.csv", { request: { headers: { Authorization: token } }, delimiter: ";" });
 * ```
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
 */
export interface DownloadGraphOptions extends ExportGraphOptions {
    /**
     * The file name the browser saves as. The default is "graph" plus the first entry of the
     * format's `extensions` ("graph.graphml"), or "graph.<format>" when it lists none.
     */
    readonly filename?: string | undefined;
}

/** One format the registry can read, write or both. */
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

/** The options of exportGraph(): the common export options plus any format-specific option, passed through. */
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
 * order of sniffing (design section 8.2); the default registry lists the built-in formats in the
 * order of GRAPH_FORMATS.
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
     * Rank the registered importers for an input (design section 8.2; the successor of
     * graphty-element's detectFormat()).
     * @param hints - the filename, MIME type and / or head of the input
     * @returns the candidates, best first; empty when nothing matches
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
     * Read an input into a fresh builder and freeze it (design section 8.4: for callers who do not
     * own a sink). The format is the one named in the options, else sniffed from the filename,
     * the MIME type and the first bytes of the content; the builder is seeded from the common
     * options with `directed: true` as a placeholder that the importer overrides from the file.
     * An input holding several graphs yields the first, with a warning naming how many were
     * skipped; importAllGraphs() returns every one.
     * @param input - the text, bytes, stream or chunks to read
     * @param options - the format, hints, common and format-specific import options
     * @returns the snapshot, the import report and the freeze report
     */
    async importGraph(input: ImportInput, options: ImportGraphOptions = {}): Promise<ImportGraphResult> {
        const chosen = await this.choose(input, options);
        let builder: GraphBuilder;
        let report: ImportReport;
        try {
            builder = seededBuilder(options, chosen.importer.format);
            report = await chosen.importer.import(chosen.source, builder, importerOptions(options));
        } catch (err) {
            await chosen.peeked?.close();
            throw err;
        }
        return result(chosen, builder, report, options);
    }

    /**
     * Fetch a graph file from a URL and load it; see the top-level loadFromUrl() for the full
     * description.
     * @param url - an absolute URL, or in a browser one relative to the page
     * @param options - import options, plus `request` for fetch
     * @returns the graph, the format it was read as, and the import report
     */
    async loadFromUrl(url: string | URL, options: LoadFromUrlOptions = {}): Promise<ImportGraphResult> {
        const { request, ...rest } = options;
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
            return fetchFailed(rest, url, `${where} failed: network error or CORS refusal`, null, err);
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
    loadFromFile(file: Blob, options: ImportGraphOptions = {}): Promise<ImportGraphResult> {
        const {name} = (file as { name?: unknown });
        return this.importGraph(file.stream(), {
            ...options,
            filename: options.filename ?? (typeof name === "string" ? name : null),
            mimeType: options.mimeType ?? (file.type === "" ? null : file.type),
        });
    }

    /**
     * Read every graph of an input (a DOT file with several graphs, a Pajek project with several
     * networks, a JGF document with a `graphs` array), each into its own fresh builder, frozen.
     * A format whose importer has no importAll() holds one graph per input, so the result has one
     * entry. Options, sniffing and the builder seed are those of importGraph().
     * @param input - the text, bytes, stream or chunks to read
     * @param options - the format, hints, common and format-specific import options
     * @returns one result per graph, in document order
     */
    async importAllGraphs(input: ImportInput, options: ImportGraphOptions = {}): Promise<ImportGraphResult[]> {
        const chosen = await this.choose(input, options);
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
            throw inGraph(err, builders.length - 1);
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
    async listGraphs(input: ImportInput, options: ImportGraphOptions = {}): Promise<readonly GraphListing[] | null> {
        const chosen = await this.choose(input, options);
        try {
            return chosen.importer.listGraphs === undefined
                ? null
                : await chosen.importer.listGraphs(chosen.source, importerOptions(options));
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
                        `the ${format} importer's sniff() threw (${messageOf(err)}); it was treated as not recognising the input`,
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
                `no registered importer recognises the input${describeHints(options)}${what}; pass the format explicitly`,
                undefined,
                { formats: this.formats() },
            );
        }
        return { importer: this.importer(sniff.format), sniff, source: peeked.input, peeked, warnings };
    }

    /**
     * Write a snapshot in a format, as UTF-8 chunks (design section 8.5).
     * @param snapshot - the snapshot
     * @param format - the format name
     * @param options - the exporter's common and format-specific options
     * @returns the encoded chunks
     */
    exportGraph(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions): AsyncIterable<Uint8Array> {
        return this.exporter(format).export(snapshot, options);
    }

    /**
     * Write a snapshot in a format, as one string.
     * @param snapshot - the snapshot
     * @param format - the format name
     * @param options - the exporter's common and format-specific options
     * @returns the whole document
     */
    async exportGraphToString(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions): Promise<string> {
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
    exportGraphToBytes(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions): Promise<Uint8Array> {
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
    async exportGraphToBlob(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions): Promise<Blob> {
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
    checkExport(snapshot: GraphSnapshot, format: FormatName, options?: ExportGraphOptions): readonly LossNote[] {
        return this.exporter(format).check(snapshot, options);
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
 * A registry holding the eight built-in importers and exporters in the order of GRAPH_FORMATS.
 * @returns a new registry
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

/** The default registry: every built-in format. */
export const registry: FormatRegistry = createRegistry();

/**
 * Read an input into a fresh builder and freeze it, through the default registry (design section
 * 8.4: `importGraph(input, { format?, ...options })`).
 * @param input - the text, bytes, stream or chunks to read
 * @param options - the format, hints, common and format-specific import options
 * @returns the snapshot, the import report and the freeze report
 */
export function importGraph(input: ImportInput, options?: ImportGraphOptions): Promise<ImportGraphResult> {
    return registry.importGraph(input, options);
}

/**
 * Read every graph of an input, each into its own frozen snapshot, through the default registry.
 * @param input - the text, bytes, stream or chunks to read
 * @param options - the format, hints, common and format-specific import options
 * @returns one result per graph, in document order
 */
export function importAllGraphs(input: ImportInput, options?: ImportGraphOptions): Promise<ImportGraphResult[]> {
    return registry.importAllGraphs(input, options);
}

/**
 * The graphs of an input that can hold several, through the default registry.
 * @param input - the text, bytes, stream or chunks to read
 * @param options - the format, hints, common and format-specific import options
 * @returns one listing per graph, in document order; null when the format does not list its graphs
 */
export function listGraphs(input: ImportInput, options?: ImportGraphOptions): Promise<readonly GraphListing[] | null> {
    return registry.listGraphs(input, options);
}

/**
 * Write a snapshot in a format through the default registry, as UTF-8 chunks.
 * @param snapshot - the snapshot
 * @param format - the format name
 * @param options - the exporter's common and format-specific options
 * @returns the encoded chunks
 */
export function exportGraph(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions,
): AsyncIterable<Uint8Array> {
    return registry.exportGraph(snapshot, format, options);
}

/**
 * Write a snapshot in a format through the default registry, as one string.
 * @param snapshot - the snapshot
 * @param format - the format name
 * @param options - the exporter's common and format-specific options
 * @returns the whole document
 */
export async function exportGraphToString(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions,
): Promise<string> {
    return registry.exportGraphToString(snapshot, format, options);
}

/**
 * What exporting a snapshot in a format would lose, through the default registry.
 * @param snapshot - the snapshot
 * @param format - the format name
 * @param options - the exporter's common and format-specific options
 * @returns the loss notes, empty when the export is exact
 */
export function checkExport(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions,
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
 * @throws ImportError when the file could not be loaded; `err.issue.code` is "E_FETCH" for a
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
 */
export function loadFromUrl(url: string | URL, options?: LoadFromUrlOptions): Promise<ImportGraphResult> {
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
 * @throws ImportError when the file could not be loaded (`err.issue.code` E_UNKNOWN_FORMAT or a parse error)
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
 */
export function loadFromFile(file: Blob, options?: ImportGraphOptions): Promise<ImportGraphResult> {
    return registry.loadFromFile(file, options);
}

/**
 * Write a graph in a format and return the whole file as UTF-8 bytes, ready for fs.writeFile, a
 * fetch body or a zip entry. Prefer this over exportGraphToString() when the result goes to a file
 * or the network. To stream a very large graph, use exportGraph(). To find out beforehand what the
 * file will not keep, call checkExport() with the same format and the same options object: every
 * "E_" note it returns makes this call throw, and every "W_" note describes a loss this call
 * accepts. With default options, any "E_" note makes the call throw: sanitizeIds is "error" (ids
 * are never renamed) and onMixedDirection is "error". Pass sanitizeIds "mangle" or
 * onMixedDirection "directed" / "undirected" to write anyway. The format's own options (the CSV
 * `table` and `dialect`, the GEXF `version`, ...) go in the same object.
 * @param snapshot - the graph to write
 * @param format - a format name from listFormats() where `canExport` is true
 * @param options - sanitizeIds, onMixedDirection and the format's own options
 * @returns the encoded file
 * @throws GraphFormatError with code E_UNSUPPORTED when no exporter is registered for `format`
 * @throws GraphFormatError when the graph cannot be written in this format under these options
 *   (checkExport() returns an "E_" note for the same call)
 * @example
 * ```ts
 * import { writeFile } from "node:fs/promises";
 *
 * await writeFile("out.gexf", await exportGraphToBytes(snapshot, "gexf"));
 * ```
 */
export function exportGraphToBytes(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions,
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
 */
export function exportGraphToBlob(
    snapshot: GraphSnapshot,
    format: FormatName,
    options?: ExportGraphOptions,
): Promise<Blob> {
    return registry.exportGraphToBlob(snapshot, format, options);
}

/**
 * Browser only: write a graph in a format and have the browser save it as a file, the same as
 * clicking a download link. Call it from a click handler; awaiting other work first is fine. The
 * promise resolves once the file has been handed to the browser. There is no way to learn
 * whether the user then cancelled the save. Calling it where there is no `document` (Node, a
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
 */
export async function downloadGraph(
    snapshot: GraphSnapshot,
    format: FormatName,
    options: DownloadGraphOptions = {},
): Promise<void> {
    if (typeof document === "undefined") {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            "downloadGraph() needs a browser document; use exportGraphToBytes() and write the bytes yourself",
        );
    }
    const { filename, ...rest } = options;
    const blob = await registry.exportGraphToBlob(snapshot, format, rest);
    const extension = registry.listFormats().find((f) => f.format === format)?.extensions[0] ?? `.${format}`;
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
 */
export function listFormats(): readonly FormatInfo[] {
    return registry.listFormats();
}

/**
 * Sniff an input's format through the default registry.
 * @param hints - the filename, MIME type and / or head of the input
 * @returns the best candidate, or null when no built-in importer claims it
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
        report: withMergedEdges(
            warnings.length === 0
                ? report
                : Object.freeze({
                      ...report,
                      issues: Object.freeze([...warnings, ...report.issues]),
                      warningCount: report.warningCount + warnings.length,
                  }),
            frozen.report.mergedEdges,
        ),
        freeze: frozen.report,
    });
}

/**
 * The import report with one W_EDGES_MERGED warning when the freeze merged parallel edges: a
 * merging duplicateEdges policy (on the builder or as a per-freeze override) keeps one edge per
 * group, and whatever told the others apart (a relation, a label) is gone.
 * @param report - the import's report
 * @param merged - the freeze report's mergedEdges
 * @returns the report, with the warning when merged is not 0
 */
function withMergedEdges(report: ImportReport, merged: number): ImportReport {
    if (merged === 0) {
        return report;
    }
    const issue = Object.freeze({
        category: "merged" as const,
        severity: "warning" as const,
        code: EDGES_MERGED_CODE,
        message: `${merged} parallel edge(s) were merged into one edge per pair by the duplicateEdges policy; whatever told them apart (a relation, a label) is lost`,
        line: null,
        element: null,
    });
    return Object.freeze({
        ...report,
        issues: Object.freeze([...report.issues, issue]),
        warningCount: report.warningCount + 1,
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
     * abort for instance): a stream's reader is cancelled and released, an async generator finalised.
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
