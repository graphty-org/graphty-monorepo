/**
 * @file Writing the graph to a file: the snapshot an export hands a graph-io exporter, and the
 * table of writers, built-in and registered.
 *
 * WHAT AN EXPORT CARRIES. Whatever the chosen format can represent: every node and edge with the
 * attributes it was loaded or edited with, the current positions, every published algorithm
 * result and the style each element is drawn with. The element resolves all of it into one
 * graph-format snapshot -- positions into the `position` role column, colours, sizes and edge
 * widths into the `color`, `size` and `thickness` role columns, results into attribute columns
 * named by their result path -- and the exporter writes what its format has a place for. The
 * exporter's `check()` lists everything else as a loss note, so nothing is dropped silently.
 *
 * WHAT IT NEVER CARRIES. The element's own bookkeeping: its internal edge ids and every
 * `graphty.`-prefixed column. A value an algorithm did not measure is left unset, which each
 * format writes as its own "absent".
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the renderer hands style in through
 * {@link ExportViewState}.
 */

import { type ColumnDecl, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import {
    type CommonExportOptions,
    csvExporter,
    dotExporter,
    gexfExporter,
    gmlExporter,
    type GraphExporter,
    graphmlExporter,
    jsonExporter,
    type LossNote,
    neo4jExporter,
    pajekExporter,
} from "@graphty/graph-io";

import { resolveOptionValues } from "../catalog/options";
import type { FormatId, Rgba } from "../catalog/types";
import { catalogFormatDescriptors, registeredFormatWriter } from "../catalog/writerRegistry";
import { GraphtyError } from "../errors";
import type { GraphSession } from "../session/types";

/** Options of one export: the writer's own, and graph-io's common ones. */
export type ExportGraphOptions = Readonly<Record<string, unknown>> & CommonExportOptions;

/** What `exportGraph` returns. */
export interface ExportResult {
    /** The format written. */
    readonly format: FormatId;
    /**
     * Everything the format could not carry, one note per kind of omission, from the exporter's
     * `check()`. Empty only when the export is exact.
     */
    readonly lossNotes: readonly LossNote[];
    /**
     * The whole output as one string.
     * @returns The document.
     * @throws A `GraphtyError` (as a rejection): `E_UNSUPPORTED` when the writer refuses this graph
     * under these options, `E_INTERNAL` when it failed.
     */
    text(): Promise<string>;
    /** The output as UTF-8 chunks, for a file too large to hold as one string. Iterable more than once. */
    readonly bytes: AsyncIterable<Uint8Array>;
}

/** What the renderer knows about each element that the session does not hold: how it is drawn. */
interface ExportViewState {
    /**
     * What a node is drawn as.
     * @param row - The node's row in the session's snapshot.
     * @returns Its colour and size, or undefined when nothing is drawn.
     */
    nodeStyle?(row: number): { readonly color: Rgba | null; readonly size: number | undefined } | undefined;
    /**
     * What an edge is drawn as.
     * @param row - The edge's row in the session's snapshot.
     * @returns Its colour and width, or undefined when nothing is drawn.
     */
    edgeStyle?(row: number): { readonly color: Rgba | null; readonly width: number | undefined } | undefined;
}

type AnyExporter = GraphExporter<Record<string, unknown> & CommonExportOptions>;

/** The graph-io exporter behind each built-in format. */
const BUILT_IN_WRITERS: Readonly<Record<string, AnyExporter>> = {
    json: jsonExporter as AnyExporter,
    csv: csvExporter as AnyExporter,
    graphml: graphmlExporter as AnyExporter,
    gexf: gexfExporter as AnyExporter,
    gml: gmlExporter as AnyExporter,
    dot: dotExporter as AnyExporter,
    pajek: pajekExporter as AnyExporter,
};

/**
 * Record keys the element reads with a meaning of its own; never written as attributes. A loaded
 * `position` is where a node started, and the current coordinates replace it.
 */
const NODE_STRUCTURE = new Set(["id", "position"]);
const EDGE_STRUCTURE = new Set(["id", "source", "target"]);
const INTERNAL_PREFIX = "graphty.";

/** The role columns the element writes, under names no loaded attribute is likely to hold. */
const POSITION: ColumnDecl = { name: "position", dtype: "f64", components: 3, role: "position", nullable: true };
const NODE_COLOR: ColumnDecl = { name: "style.color", dtype: "f32", components: 4, role: "color", nullable: true };
const NODE_SIZE: ColumnDecl = { name: "style.size", dtype: "f64", role: "size", nullable: true };
const EDGE_COLOR: ColumnDecl = { name: "style.color", dtype: "f32", components: 4, role: "color", nullable: true };
const EDGE_THICKNESS: ColumnDecl = { name: "style.thickness", dtype: "f64", role: "thickness", nullable: true };

/**
 * The attributes of one record the export writes.
 * @param record - The record.
 * @param skip - The structural keys.
 * @returns The attributes.
 */
function attributesOf(record: Readonly<Record<string, unknown>>, skip: ReadonlySet<string>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (!skip.has(key) && !key.startsWith(INTERNAL_PREFIX) && value !== undefined && value !== null) {
            out[key] = value;
        }
    }

    return out;
}

/**
 * A colour as graph-format's `color` role holds it: four components from 0 to 1.
 * @param color - Components 0-255, alpha 0-1.
 * @returns The components.
 */
function colorCell(color: Rgba): number[] {
    return [color.r / 255, color.g / 255, color.b / 255, color.a];
}

/**
 * Build the snapshot an export writes.
 * @param session - The session: its records and its published results.
 * @param view - Style, from the renderer; absent in a session with no view.
 * @returns The snapshot, and a note for each result value no column could hold.
 */
export function buildExportSnapshot(
    session: GraphSession,
    view: ExportViewState = {},
): { snapshot: GraphSnapshot; notes: LossNote[] } {
    const notes: LossNote[] = [];
    const current = session.data.snapshot();
    const builder = new GraphBuilder({
        directed: current.directed,
        duplicateEdges: "keep",
        selfLoops: "keep",
        addMissingNodes: true,
        weightDtype: "f64",
    });

    const nodes = session.data.nodes();
    const edges = session.data.edges();
    for (const record of nodes) {
        builder.addNodeRecord(record.id, attributesOf(record, NODE_STRUCTURE));
    }

    let unweighable = 0;
    for (const record of edges) {
        const attributes = attributesOf(record, EDGE_STRUCTURE);
        const explicit = typeof attributes.weight === "number";
        if (!explicit && attributes.weight !== undefined) {
            delete attributes.weight;
            unweighable++;
        }

        builder.addEdgeRecord(record.source, record.target, attributes, explicit ? "weight" : null);
    }

    if (unweighable > 0) {
        notes.push({
            code: "W_WEIGHT_NOT_NUMERIC",
            message: `${String(unweighable)} edge(s) carry a weight that is not a number, and it is not written`,
            column: "weight",
            count: unweighable,
        });
    }

    // A node no layout has placed yet has no coordinates, not the origin.
    const { positions } = session;
    if (positions.placedCount > 0) {
        const column = builder.declareNodeColumn(POSITION);
        const at = { x: 0, y: 0, z: 0 };
        nodes.forEach((_record, row) => {
            if (positions.isPlaced(row)) {
                positions.read(row, at);
                builder.setNodeValue(column, row, [at.x, at.y, at.z]);
            }
        });
    }

    if (view.nodeStyle !== undefined) {
        const color = builder.declareNodeColumn(NODE_COLOR);
        const size = builder.declareNodeColumn(NODE_SIZE);
        nodes.forEach((_record, row) => {
            const style = view.nodeStyle?.(row);
            if (style?.color) {
                builder.setNodeValue(color, row, colorCell(style.color));
            }

            if (style?.size !== undefined) {
                builder.setNodeValue(size, row, style.size);
            }
        });
    }

    if (view.edgeStyle !== undefined) {
        const color = builder.declareEdgeColumn(EDGE_COLOR);
        const thickness = builder.declareEdgeColumn(EDGE_THICKNESS);
        edges.forEach((_record, row) => {
            const style = view.edgeStyle?.(row);
            if (style?.color) {
                builder.setEdgeValue(color, row, colorCell(style.color));
            }

            if (style?.width !== undefined) {
                builder.setEdgeValue(thickness, row, style.width);
            }
        });
    }

    writeResults(session, builder, notes);
    return { snapshot: builder.freeze(), notes };
}

/**
 * Write every published result as attribute columns, named by the result's path.
 * @param session - The session.
 * @param builder - The export's builder, rows in the session's order.
 * @param notes - Receives a note for each field no column could hold.
 */
function writeResults(session: GraphSession, builder: GraphBuilder, notes: LossNote[]): void {
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    for (const root of session.results.roots) {
        const result = session.results.get(root.runId);
        if (result === undefined) {
            continue;
        }

        for (const field of result.fields) {
            const name = session.results.path(root.runId, field.name);
            try {
                if (field.kind === "node") {
                    nodes.forEach((record, row) => {
                        const value = result.node(record.id)?.[field.name];
                        if (value !== undefined && value !== null) {
                            builder.setNodeValue(name, row, value);
                        }
                    });
                } else if (field.kind === "edge") {
                    edges.forEach((record, row) => {
                        const value = result.edge(record.id)?.[field.name];
                        if (value !== undefined && value !== null) {
                            builder.setEdgeValue(name, row, value);
                        }
                    });
                } else if (result.graph[field.name] !== undefined && result.graph[field.name] !== null) {
                    builder.setGraphValue(name, result.graph[field.name]);
                }
            } catch (error) {
                notes.push({
                    code: "W_RESULT_FIELD_DROPPED",
                    message: `the result field ${name} could not be written: ${error instanceof Error ? error.message : String(error)}`,
                    column: name,
                    count: null,
                });
            }
        }
    }
}

/**
 * The exporter for a format, and the options to hand it.
 * @param format - The format id.
 * @param options - What the caller passed.
 * @returns The exporter and its options.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT` when nothing writes the format, or
 * `E_UNKNOWN_OPTION` / `E_OPTION_RANGE` when a registered writer refuses an option.
 */
function writerFor(
    format: FormatId,
    options: ExportGraphOptions,
): { exporter: AnyExporter; options: Record<string, unknown> & CommonExportOptions } {
    if (format === "csv" && options.variant === "neo4j") {
        const { variant: _variant, ...rest } = options;
        return { exporter: neo4jExporter as AnyExporter, options: rest };
    }

    const builtIn = BUILT_IN_WRITERS[format];
    if (builtIn !== undefined) {
        // graph-io writes a directed graph in the Gephi dialect (Source, Target, Type, Weight);
        // the element's CSV reader reads those headers back under their capitalised names, so a
        // round trip through the element would rename every column. The plain dialect reads back
        // as it was written. `{ dialect: "gephi" }` still asks for the other.
        return { exporter: builtIn, options: format === "csv" ? { dialect: "generic", ...options } : { ...options } };
    }

    const registered = registeredFormatWriter(format);
    if (registered === undefined) {
        throw new GraphtyError({
            code: "E_UNKNOWN_FORMAT",
            message: `nothing writes the format "${format}"`,
            source: "data",
            details: {
                format,
                available: [
                    ...Object.keys(BUILT_IN_WRITERS),
                    ...catalogFormatDescriptors()
                        .filter((descriptor) => descriptor.canExport)
                        .map((descriptor) => descriptor.id),
                ],
            },
        });
    }

    const { sanitizeIds, onMixedDirection, ...own } = options;
    const resolved = resolveOptionValues(registered.writerOptions ?? [], own, { kind: "format", id: format });
    return {
        exporter: registered.exporter,
        options: {
            ...resolved,
            ...(sanitizeIds === undefined ? {} : { sanitizeIds }),
            ...(onMixedDirection === undefined ? {} : { onMixedDirection }),
        },
    };
}

/**
 * Turn what an exporter threw into the error the caller receives.
 * @param error - What was thrown.
 * @param format - The format being written.
 * @returns `E_UNSUPPORTED` when the exporter refused the graph with a coded error (an id the
 * format cannot hold, a direction it cannot write), `E_INTERNAL` otherwise.
 */
function writerFailure(error: unknown, format: string): GraphtyError {
    const coded = typeof (error as { code?: unknown } | null)?.code === "string";
    return GraphtyError.wrap(error, {
        code: coded ? "E_UNSUPPORTED" : "E_INTERNAL",
        source: "data",
        details: { format, reason: "the writer refused this graph under these options" },
    });
}

/**
 * Write a snapshot in a format.
 * @param snapshot - What to write.
 * @param format - The format id.
 * @param options - The writer's options.
 * @param notes - Notes the element raised while building the snapshot.
 * @returns The result.
 * @throws A `GraphtyError`: `E_UNKNOWN_FORMAT`, an option error, or the writer's failure from
 * its `check()`.
 */
export function exportSnapshot(
    snapshot: GraphSnapshot,
    format: FormatId,
    options: ExportGraphOptions = {},
    notes: readonly LossNote[] = [],
): ExportResult {
    const writer = writerFor(format, options);
    let checked: readonly LossNote[];
    try {
        checked = writer.exporter.check(snapshot, writer.options);
    } catch (error) {
        throw writerFailure(error, format);
    }

    return {
        format,
        lossNotes: Object.freeze([...notes, ...checked]),
        async text(): Promise<string> {
            try {
                return await writer.exporter.exportToString(snapshot, writer.options);
            } catch (error) {
                throw writerFailure(error, format);
            }
        },
        bytes: {
            async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
                try {
                    yield* writer.exporter.export(snapshot, writer.options);
                } catch (error) {
                    throw writerFailure(error, format);
                }
            },
        },
    };
}
