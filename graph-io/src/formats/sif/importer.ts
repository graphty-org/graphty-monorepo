/**
 * The SIF importer: Cytoscape's Simple Interaction Format, one interaction per line,
 * `source interaction target [target ...]`. A line with one name is a node with no edges; a line
 * with several targets is one edge per target. The interaction becomes the `interaction` edge column
 * (role `kind`). Following Cytoscape, a file that holds any tab separates its fields by tabs only (so
 * names may contain spaces); a file without tabs separates them by runs of whitespace. Edges are
 * directed, as Cytoscape reads them, unless the caller passes `defaultDirected: false`.
 */

import { type ColumnHandle, GraphFormatError, type GraphSink, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { declareResolved, RENAMED_CODE, ROLE_TAKEN_CODE } from "../../common/attributes.js";
import {
    ELEMENT_ISSUE,
    ENCODING_FALLBACK_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    OPTION_IGNORED_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../common/codes.js";
import { DirectionResolver } from "../../common/direction.js";
import { IdCoercer } from "../../common/ids.js";
import { readText, throwIfAborted } from "../../common/input.js";
import {
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    resolveImportOptions,
    SINK_OPTION_CODE,
} from "../../common/options.js";
import { ImportReportBuilder, isAbortError } from "../../common/report.js";
import { isNumericText } from "../../common/text.js";
import { SNIFF_HEAD_BYTES } from "../../sniff.js";
import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../../types.js";

/**
 * The name of the edge column the interaction of each line is read into (role `kind`).
 * @category Built-in formats
 */
export const INTERACTION_COLUMN = "interaction";

/**
 * The options of the SIF importer: the common import options only.
 * @category Built-in formats
 */
export type SifImportOptions = CommonImportOptions;

/**
 * Issue codes of the SIF importer.
 * @category Built-in formats
 */
export const SIF_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
    /** The input is not valid UTF-8. The import stops. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /**
     * Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The
     * import stops.
     */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 and declare no encoding were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A line with a node and an interaction but no target: the node is kept and no edge is added. */
    NO_TARGET: "W_SIF_NO_TARGET",
    /** You read into a graph builder that already has a column named `interaction` of another type, so it was renamed. */
    COLUMN_RENAMED: RENAMED_CODE,
    /** You read into a graph builder that already has an edge kind column, so `interaction` is kept as a plain attribute. */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /**
     * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
     * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
     */
    SINK_OPTION: SINK_OPTION_CODE,
});

/** The common options the SIF importer reads (the rest is reported by reportUnusedOptions). */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "defaultDirected",
    "errorLimit",
    "signal",
    "onProgress",
    "encoding",
]);

const DEFAULTS: ImportFormatDefaults = { ids: "canonical", defaultDirected: true, weightFrom: null };

/** How often, in lines, the cancellation signal is checked. */
const ABORT_CHECK_INTERVAL = 64;

/**
 * Split a SIF line into its fields: on tabs when the file holds a tab (each field trimmed), else on
 * whitespace; empty fields are dropped.
 * @param line - the line
 * @param tabs - whether the file holds a tab
 * @returns the fields
 */
function sifFields(line: string, tabs: boolean): string[] {
    const parts = tabs ? line.split("\t").map((f) => f.trim()) : line.trim().split(/\s+/);
    return parts.filter((f) => f !== "");
}

/**
 * A line that opens another format (markup, JSON, DOT, Pajek, a comment), holds CSV or key=value
 * punctuation, or has a word that ends a sentence: not SIF.
 */
const NOT_SIF = /(?:^\s*(?:[<{[*#%/!]|(?:strict\s+)?(?:di)?graph\b))|[,;"=]|[.!?](?:\s|$)/i;

/**
 * Whether text holds a C0 control character other than tab, line feed and carriage return: binary
 * data, not SIF.
 * @param text - the decoded head
 * @returns true when it holds one
 */
function hasControlCharacter(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const c = text.codePointAt(i) ?? 0;
        if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) {
            return true;
        }
    }
    return false;
}

/** What the sniffer found in the lines of a head. */
interface HeadShape {
    /** The interaction of every line with one. */
    readonly interactions: string[];
    /** How many lines hold a single name. */
    names: number;
    /** How many lines are `a b <number>`, as in a headerless weighted edge list. */
    weighted: number;
}

/**
 * Read the lines of a head into its shape, or null when a line cannot be SIF.
 * @param lines - the lines
 * @param tabs - whether the head holds a tab
 * @returns the shape, or null
 */
function headShape(lines: readonly string[], tabs: boolean): HeadShape | null {
    const shape: HeadShape = { interactions: [], names: 0, weighted: 0 };
    for (const line of lines) {
        const fields = sifFields(line, tabs);
        if (fields.length === 2 || NOT_SIF.test(line) || (fields.length > 2 && isNumericText(fields[1]))) {
            return null;
        }
        if (fields.length === 1) {
            shape.names++;
        } else if (fields.length > 2) {
            shape.interactions.push(fields[1]);
            shape.weighted += fields.length === 3 && isNumericText(fields[2]) ? 1 : 0;
        }
    }
    return shape;
}

/**
 * Sniff confidence: 0 for anything with a two-field line, a numeric interaction, a control
 * character, a sentence or the opening of another format, for a single line and for a headerless
 * weighted edge list (every line `a b <number>`); otherwise 0.7 for interaction lines whose
 * interactions repeat (as SIF's few interaction types do), 0.5 for a list of single names, 0.4 for
 * other interaction lines.
 * @param head - the first bytes of the input
 * @returns a confidence in 0..1
 */
function sniff(head: Uint8Array): number {
    const text = new TextDecoder().decode(head);
    if (hasControlCharacter(text)) {
        return 0;
    }
    const lines = text.split(/\r\n|\r|\n/);
    if (head.byteLength >= SNIFF_HEAD_BYTES) {
        // the last line may be cut off
        lines.pop();
    }
    const shape = headShape(lines, text.includes("\t"));
    if (shape === null) {
        return 0;
    }
    const { interactions, names, weighted } = shape;
    if (interactions.length === 0) {
        return names > 1 ? 0.5 : 0;
    }
    if (interactions.length + names < 2 || weighted === interactions.length) {
        return 0;
    }
    return interactions.length > 1 && new Set(interactions).size <= interactions.length / 2 ? 0.7 : 0.4;
}

/** Reads the lines of one file into a sink. */
class SifReader {
    private readonly edges: DirectionResolver;

    private readonly ids: IdCoercer;

    private interaction: ColumnHandle | null = null;

    /**
     * Create a reader.
     * @param sink - the sink
     * @param report - the report
     * @param opts - the resolved options
     */
    constructor(
        private readonly sink: GraphSink,
        private readonly report: ImportReportBuilder,
        private readonly opts: ReturnType<typeof resolveImportOptions>,
    ) {
        this.ids = new IdCoercer(opts.ids);
        this.edges = new DirectionResolver(sink, report, opts.onMixedDirection);
        this.edges.setHeader(opts.defaultDirected);
    }

    /**
     * Read one line's fields.
     * @param fields - the fields, at least one
     * @param line - the line number
     */
    read(fields: readonly string[], line: number): void {
        const source = this.node(fields[0]);
        if (fields.length === 2) {
            this.report.warning(
                "missing-value",
                SIF_ISSUE.NO_TARGET,
                `interaction "${fields[1]}" has no target; only node "${fields[0]}" is read`,
                { line },
            );
            return;
        }
        const kind = this.opts.defaultDirected ? "directed" : "undirected";
        for (let i = 2; i < fields.length; i++) {
            const target = this.node(fields[i]);
            const e = this.edges.addEdge(source, target, kind, undefined, { line });
            this.report.counts.edges++;
            this.setInteraction(e, fields[1], line);
        }
    }

    /**
     * Add a node, counting it when it is new.
     * @param text - the name as written
     * @returns its id
     */
    private node(text: string): NodeId {
        const id = this.ids.text(text);
        if (this.sink.indexOf(id) === INVALID_INDEX) {
            this.report.counts.nodes++;
        }
        this.sink.addNode(id);
        return id;
    }

    /**
     * Write an edge's interaction, declaring the column on first use.
     * @param e - the edge index
     * @param value - the interaction
     * @param line - the line number
     */
    private setInteraction(e: number, value: string, line: number): void {
        this.interaction ??= declareResolved(
            this.sink,
            "edge",
            { name: INTERACTION_COLUMN, dtype: "dict", nullable: true, role: "kind" },
            this.report,
            { line },
        ).handle;
        this.sink.setEdgeValue(this.interaction, e, value);
    }
}

/**
 * The SIF importer, registered as "sif" for `.sif` files.
 * @category Built-in formats
 */
export const sifImporter: GraphImporter<SifImportOptions> = Object.freeze({
    format: "sif",
    extensions: Object.freeze([".sif"]),
    mimeTypes: Object.freeze([]),
    options: Object.freeze([]),
    sniff,
    async import(input: ImportInput, sink: GraphSink, options?: SifImportOptions): Promise<ImportReport> {
        const opts = resolveImportOptions(options, DEFAULTS);
        const report = new ImportReportBuilder("sif", opts.errorLimit);
        reportSinkOptions(sink, options, report);
        reportUnusedOptions(options, report, USED_OPTIONS);
        // an empty file is an empty network: the only way SIF writes a graph with no nodes
        const text = await readText(input, report, { ...opts, allowEmpty: true });
        const reader = new SifReader(sink, report, opts);
        const tabs = text.includes("\t");
        const lines = text.split(/\r\n|\r|\n/);
        for (let i = 0; i < lines.length; i++) {
            if (i % ABORT_CHECK_INTERVAL === 0) {
                throwIfAborted(opts.signal);
            }
            const fields = sifFields(lines[i], tabs);
            if (fields.length === 0) {
                continue;
            }
            try {
                reader.read(fields, i + 1);
            } catch (err) {
                if (isAbortError(err) || !(err instanceof GraphFormatError)) {
                    throw err;
                }
                report.recordError(err, { line: i + 1 });
            }
        }
        throwIfAborted(opts.signal);
        return report.finish();
    },
});
