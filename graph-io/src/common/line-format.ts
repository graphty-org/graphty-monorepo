/**
 * defineLineFormat(): an importer for a text format with one node or one edge per line, built from
 * one function that reads a line. Everything else an importer must do (options, decoding, the
 * report and its counts, ids, direction, weights, attribute types, cancelling) is done here.
 */

import { GraphFormatError, type GraphSink, INVALID_INDEX } from "@graphty/graph-format";

import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../types.js";
import { BAD_LINE_CODE } from "./codes.js";
import { DirectionResolver } from "./direction.js";
import { IdCoercer } from "./ids.js";
import { LineReader, throwIfAborted } from "./input.js";
import { reportSinkOptions, reportUnusedOptions, resolveImportOptions } from "./options.js";
import { ImportReportBuilder, isAbortError, messageOf } from "./report.js";
import { TextCellWriter } from "./text.js";
import { parseWeightText } from "./weights.js";

/**
 * Attribute values for a node or an edge added by defineLineFormat()'s `parseLine`.
 * @category Writing a format
 */
export type LineAttributes = Readonly<Record<string, string | number | boolean | null | undefined>>;

/**
 * What `parseLine` adds a line's node or edge with.
 * @category Writing a format
 */
export interface LineGraph {
    /**
     * Add a node, or give a node that already exists more attributes. A `label` attribute is the
     * node's label, which `snapshot.nodes.byRole("label")` finds; any other attribute's type (text,
     * integer, number, boolean) is worked out from its values, as for a CSV column.
     * @param id - the node id as written in the file
     * @param attributes - attribute values, such as `{ label: "Alice" }`
     */
    node(id: string, attributes?: LineAttributes): void;
    /**
     * Add an edge. A node it names that does not exist yet is added. The attribute that `weightFrom`
     * names (`weight` unless the caller passes another name) becomes the edge weight.
     * @param source - the source node id as written in the file
     * @param target - the target node id as written in the file
     * @param attributes - attribute values, such as `{ weight: "2.5" }`
     */
    edge(source: string, target: string, attributes?: LineAttributes): void;
}

/**
 * A text format with one node or one edge per line, for defineLineFormat().
 * @category Writing a format
 */
export interface LineFormat {
    /** The format name, which callers pass as `format`. */
    readonly format: string;
    /** The file extensions, with the dot (`[".tgf"]`); format detection matches them. */
    readonly extensions: readonly string[];
    /** MIME types the format is served as; none when left out. */
    readonly mimeTypes?: readonly string[] | undefined;
    /** Whether a file is directed when the caller passes no `defaultDirected`; false when left out. */
    readonly directed?: boolean | undefined;
    /** Lines that start with this text are skipped; `"#"` when left out, null to skip none. Blank lines are always skipped. */
    readonly comment?: string | null | undefined;
    /**
     * How sure you are that the first bytes of a file are this format, from 0 to 1. A file is
     * recognized by its content only when this returns 0.5 or more; without it, detection goes by
     * the file extension.
     */
    readonly sniff?: ((head: Uint8Array) => number) | undefined;
    /**
     * Read one line. `fields` is the line split on whitespace. Call `graph.node()` or `graph.edge()`
     * for what the line holds, and throw an Error to skip a line you cannot read: its message is
     * recorded as an `E_BAD_LINE` error with the line number.
     */
    readonly parseLine: (fields: readonly string[], graph: LineGraph, line: string) => void;
}

/** The common options a line format reads; a caller's other ones are reported as W_OPTION_IGNORED. */
const USED = new Set<keyof CommonImportOptions>(["ids", "defaultDirected", "weightFrom", "addMissingNodes"]);

/**
 * Make an importer for a text format with one node or one edge per line. You write `parseLine`,
 * which reads one line; the importer handles every input graph-io takes, the options every importer
 * takes, the import report and its counts, cancelling and progress. Register the result with
 * `registry.registerImporter()`.
 * @example
 * ```ts
 * // "a b" is an edge, "a" alone is a node
 * const edgeList = defineLineFormat({
 *     format: "edges",
 *     extensions: [".edges"],
 *     parseLine(fields, graph) {
 *         if (fields.length === 1) {
 *             graph.node(fields[0]);
 *         } else if (fields.length === 2) {
 *             graph.edge(fields[0], fields[1]);
 *         } else {
 *             throw new Error("expected one or two node ids");
 *         }
 *     },
 * });
 * registry.registerImporter(edgeList);
 * ```
 * @param definition - the format: its name, extensions and `parseLine`
 * @returns the importer
 * @category Writing a format
 */
export function defineLineFormat(definition: LineFormat): GraphImporter {
    const { format, extensions, mimeTypes = [], directed = false, comment = "#", sniff, parseLine } = definition;
    const importer: GraphImporter = {
        format,
        extensions,
        mimeTypes,
        options: [],
        import: async (input: ImportInput, sink: GraphSink, options?: CommonImportOptions): Promise<ImportReport> => {
            const opts = resolveImportOptions(options, {
                ids: "canonical",
                defaultDirected: directed,
                weightFrom: "weight",
            });
            const report = new ImportReportBuilder(format, opts.errorLimit);
            reportSinkOptions(sink, options, report);
            reportUnusedOptions(options, report, USED);
            const ids = new IdCoercer(opts.ids);
            const edges = new DirectionResolver(sink, report, opts.onMixedDirection);
            const kind = opts.defaultDirected ? "directed" : "undirected";
            edges.setHeader(opts.defaultDirected);
            const writers = { node: new Map<string, TextCellWriter>(), edge: new Map<string, TextCellWriter>() };
            const write = (domain: "node" | "edge", row: number, attributes: LineAttributes | undefined): void => {
                for (const [name, value] of Object.entries(attributes ?? {})) {
                    if (value === null || value === undefined || (domain === "edge" && name === opts.weightFrom)) {
                        continue;
                    }
                    if (name === "label") {
                        // a label is text, whatever it looks like, and the column that byRole("label") finds
                        const decl = { name, dtype: "string", role: "label" } as const;
                        const column = domain === "node" ? sink.declareNodeColumn(decl) : sink.declareEdgeColumn(decl);
                        if (domain === "node") {
                            sink.setNodeValue(column, row, String(value));
                        } else {
                            sink.setEdgeValue(column, row, String(value));
                        }
                        continue;
                    }
                    let writer = writers[domain].get(name);
                    if (writer === undefined) {
                        writer = new TextCellWriter(name, domain, sink, report);
                        writers[domain].set(name, writer);
                    }
                    writer.write(row, String(value));
                }
            };
            const addNode = (id: string): number => {
                const nodeId = ids.text(id);
                if (sink.indexOf(nodeId) === INVALID_INDEX) {
                    report.counts.nodes++;
                }
                return sink.addNode(nodeId);
            };
            let line = 0;
            const graph: LineGraph = {
                node: (id, attributes) => {
                    write("node", addNode(id), attributes);
                },
                edge: (source, target, attributes) => {
                    const raw = opts.weightFrom === null ? undefined : attributes?.[opts.weightFrom];
                    const weight = raw === null || raw === undefined ? undefined : parseWeightText(String(raw), report);
                    const [s, t] = [ids.text(source), ids.text(target)];
                    const added = new Set([s, t].filter((id) => sink.indexOf(id) === INVALID_INDEX)).size;
                    const edge = edges.addEdge(s, t, kind, weight, { line });
                    report.counts.nodes += added;
                    report.counts.edges++;
                    write("edge", edge, attributes);
                },
            };
            const lines = new LineReader(input, report, opts);
            for await (const text of lines) {
                ({ line } = lines);
                if (line % 64 === 0) {
                    throwIfAborted(opts.signal);
                }
                const trimmed = text.trim();
                if (trimmed === "" || (comment !== null && trimmed.startsWith(comment))) {
                    continue;
                }
                try {
                    parseLine(trimmed.split(/\s+/), graph, text);
                } catch (err) {
                    if (isAbortError(err)) {
                        throw err;
                    }
                    if (err instanceof GraphFormatError) {
                        report.recordError(err, { line });
                    } else if (err instanceof Error) {
                        report.error("parse-error", BAD_LINE_CODE, err.message, { line });
                    } else {
                        report.error("parse-error", BAD_LINE_CODE, messageOf(err), { line });
                    }
                }
            }
            throwIfAborted(opts.signal);
            return report.finish();
        },
    };
    return Object.freeze(sniff === undefined ? importer : { ...importer, sniff });
}
