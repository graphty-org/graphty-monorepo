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

import { formatDescriptor, NEO4J_WRITER_OPTIONS } from "../catalog/formats";
import { resolveOptionValues } from "../catalog/options";
import type { FormatId, Rgba } from "../catalog/types";
import {
    catalogFormatDescriptors,
    COMMON_WRITER_OPTIONS,
    type FormatWriterRegistration,
    registeredFormatWriter,
} from "../catalog/writerRegistry";
import { GraphtyError } from "../errors";
import { resolveEdgeWeight } from "../session/project/ingest";
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
     * @returns Its colour, size and shape, or undefined when nothing is drawn.
     */
    nodeStyle?(
        row: number,
    ): { readonly color: Rgba | null; readonly size: number | undefined; readonly shape?: string } | undefined;
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
const NODE_SHAPE: ColumnDecl = { name: "style.shape", dtype: "string", role: "shape", nullable: true };
const EDGE_COLOR: ColumnDecl = { name: "style.color", dtype: "f32", components: 4, role: "color", nullable: true };
const EDGE_THICKNESS: ColumnDecl = { name: "style.thickness", dtype: "f64", role: "thickness", nullable: true };

/**
 * The record keys an export replaces with the element's own role columns. A file the element
 * exported earlier carries them as plain attributes when it is read back, and writing both the
 * attribute and the role column under one name would collide.
 */
const NODE_STYLE_KEYS = [NODE_COLOR.name, NODE_SIZE.name, NODE_SHAPE.name];
const EDGE_STYLE_KEYS = [EDGE_COLOR.name, EDGE_THICKNESS.name];

/** A text a spreadsheet would run as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;
/** A text that is a number in the JSON number grammar: a spreadsheet reads it as that number. */
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * A text cell as a spreadsheet can open it safely: one that would run as a formula gets a leading
 * apostrophe. Anything but a text, and a text that is a number, is returned as it was.
 * @param value - The cell.
 * @returns The cell to write.
 */
function neutraliseFormula<T>(value: T): T | string {
    return typeof value === "string" && FORMULA_START.test(value) && !JSON_NUMBER.test(value) ? `'${value}` : value;
}

/**
 * The attributes of one record the export writes.
 * @param record - The record.
 * @param skip - The structural keys.
 * @param cell - What each key and text value goes through: the formula guard, or nothing.
 * @returns The attributes.
 */
function attributesOf(
    record: Readonly<Record<string, unknown>>,
    skip: ReadonlySet<string>,
    cell: <T>(value: T) => T | string,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (!skip.has(key) && !key.startsWith(INTERNAL_PREFIX) && value !== undefined && value !== null) {
            out[cell(key)] = cell(value);
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

/** How the export snapshot is built for one writer. */
interface ExportBuildOptions {
    /**
     * Prefix every text cell, id and column name a spreadsheet would run as a formula with an
     * apostrophe. The CSV writer's `neutraliseFormulas`, on by default there.
     */
    readonly neutraliseFormulas?: boolean;
}

/**
 * Build the snapshot an export writes.
 * @param session - The session: its records and its published results.
 * @param view - Style, from the renderer; absent in a session with no view.
 * @param options - How to build it for the chosen writer.
 * @returns The snapshot, and a note for each value no column could hold.
 */
export function buildExportSnapshot(
    session: GraphSession,
    view: ExportViewState = {},
    options: ExportBuildOptions = {},
): { snapshot: GraphSnapshot; notes: LossNote[] } {
    const notes: LossNote[] = [];
    const cell = options.neutraliseFormulas === true ? neutraliseFormula : <T>(value: T): T => value;
    const current = session.data.snapshot();
    const { knownFields } = session.config.data;
    const builder = new GraphBuilder({
        directed: current.directed,
        duplicateEdges: "keep",
        selfLoops: "keep",
        addMissingNodes: true,
        weightDtype: "f64",
    });

    const nodes = session.data.nodes();
    const edges = session.data.edges();
    const nodeSkip = new Set([...NODE_STRUCTURE, ...(view.nodeStyle === undefined ? [] : NODE_STYLE_KEYS)]);
    const edgeSkip = new Set([...EDGE_STRUCTURE, ...(view.edgeStyle === undefined ? [] : EDGE_STYLE_KEYS)]);
    for (const record of nodes) {
        builder.addNodeRecord(cell(record.id), attributesOf(record, nodeSkip, cell));
    }

    // The weight is the one the element stores and runs on -- read through edgeWeightPath, then
    // the legacy `value` key, and folded under a repeatedEdges policy -- not the record's literal
    // `weight`. Every exporter writes the weight role under its format's own weight name; the
    // record's own keys (a custom weight path, `value`) are written as the attributes they are.
    const weightKey = "weight";
    const { weights, edgeToArc } = current;
    let unweighable = 0;
    edges.forEach((record, row) => {
        const attributes = attributesOf(record, edgeSkip, cell);
        const stored = weights === null ? undefined : weights[edgeToArc[row]];
        const weighted =
            stored !== undefined &&
            (stored !== 1 || resolveEdgeWeight(record, knownFields.edgeWeightPath).source !== "default");
        if (weighted) {
            attributes[weightKey] = stored;
        } else if (attributes.weight !== undefined && typeof attributes.weight !== "number") {
            delete attributes.weight;
            unweighable++;
        }

        builder.addEdgeRecord(
            cell(record.source),
            cell(record.target),
            attributes,
            typeof attributes[weightKey] === "number" ? weightKey : null,
        );
    });

    if (unweighable > 0) {
        notes.push({
            code: "W_WEIGHT_NOT_NUMERIC",
            message: `${String(unweighable)} edge(s) carry a weight that is not a number, and it is not written`,
            column: weightKey,
            count: unweighable,
        });
    }

    // A node no layout has placed yet has no coordinates, not the origin. The session holds scene
    // units; a file holds file units, which a load multiplies by positionScale, so divide here.
    const { positions } = session;
    if (positions.placedCount > 0) {
        const column = builder.declareNodeColumn(POSITION);
        const scale = knownFields.positionScale;
        const at = { x: 0, y: 0, z: 0 };
        nodes.forEach((_record, row) => {
            if (positions.isPlaced(row)) {
                positions.read(row, at);
                builder.setNodeValue(column, row, [at.x / scale, at.y / scale, at.z / scale]);
            }
        });
    }

    if (view.nodeStyle !== undefined) {
        const color = builder.declareNodeColumn(NODE_COLOR);
        const size = builder.declareNodeColumn(NODE_SIZE);
        const shape = builder.declareNodeColumn(NODE_SHAPE);
        nodes.forEach((_record, row) => {
            const style = view.nodeStyle?.(row);
            if (style?.color) {
                builder.setNodeValue(color, row, colorCell(style.color));
            }

            if (style?.size !== undefined) {
                builder.setNodeValue(size, row, style.size);
            }

            if (style?.shape !== undefined) {
                builder.setNodeValue(shape, row, style.shape);
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

    writeResults(session, builder, notes, cell);
    return { snapshot: builder.freeze(), notes };
}

/**
 * Write every published result as attribute columns, named by the result's path.
 * @param session - The session.
 * @param builder - The export's builder, rows in the session's order.
 * @param notes - Receives a note for each field no column could hold.
 * @param cell - What each column name and text value goes through.
 */
function writeResults(
    session: GraphSession,
    builder: GraphBuilder,
    notes: LossNote[],
    cell: <T>(value: T) => T | string,
): void {
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    for (const root of session.results.roots) {
        const result = session.results.get(root.runId);
        if (result === undefined) {
            continue;
        }

        for (const field of result.fields) {
            const name = cell(session.results.path(root.runId, field.name));
            try {
                if (field.kind === "node") {
                    nodes.forEach((record, row) => {
                        const value = result.node(record.id)?.[field.name];
                        if (value !== undefined && value !== null) {
                            builder.setNodeValue(name, row, cell(value));
                        }
                    });
                } else if (field.kind === "edge") {
                    edges.forEach((record, row) => {
                        const value = result.edge(record.id)?.[field.name];
                        if (value !== undefined && value !== null) {
                            builder.setEdgeValue(name, row, cell(value));
                        }
                    });
                } else if (result.graph[field.name] !== undefined && result.graph[field.name] !== null) {
                    builder.setGraphValue(name, cell(result.graph[field.name]));
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

/** A writer chosen for one export: the exporter, its checked options and how to build for it. */
interface ChosenWriter {
    readonly exporter: AnyExporter;
    readonly options: Record<string, unknown> & CommonExportOptions;
    readonly build: ExportBuildOptions;
}

/**
 * The exporter for a format, and the options to hand it, checked against what the format's
 * catalogue entry declares in `writerOptions` -- the same rule for a built-in writer as for a
 * registered one.
 * @param format - The format id.
 * @param options - What the caller passed.
 * @returns The exporter, its options and how to build the snapshot for it.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT` when nothing writes the format, or
 * `E_UNKNOWN_OPTION` / `E_OPTION_RANGE` when the writer does not accept an option.
 */
function writerFor(format: FormatId, options: ExportGraphOptions): ChosenWriter {
    const builtIn = BUILT_IN_WRITERS[format];
    const registered = builtIn === undefined ? registeredFormatWriter(format) : undefined;
    if (builtIn === undefined && registered === undefined) {
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

    const neo4j = format === "csv" && options.variant === "neo4j";
    let declared = formatDescriptor(format)?.writerOptions ?? COMMON_WRITER_OPTIONS;
    if (neo4j) {
        declared = NEO4J_WRITER_OPTIONS;
    } else if (registered !== undefined) {
        declared = [...(registered.writerOptions ?? []), ...COMMON_WRITER_OPTIONS];
    }
    const resolved = resolveOptionValues(declared, options, { kind: "format", id: format });
    if (format !== "csv") {
        return { exporter: builtIn ?? (registered as FormatWriterRegistration).exporter, options: resolved, build: {} };
    }

    // `variant` picks the writer and `neutraliseFormulas` is the element's own guard; graph-io
    // reads neither. CSV's `dialect` defaults to the plain one (see the catalogue entry): the
    // element's CSV reader reads Gephi's capitalised headers back under those names.
    const { variant: _variant, neutraliseFormulas, ...rest } = resolved;
    return {
        exporter: neo4j ? (neo4jExporter as AnyExporter) : builtIn,
        options: rest,
        build: { neutraliseFormulas: neutraliseFormulas !== false },
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
    return writeWith(writerFor(format, options), snapshot, format, notes);
}

/**
 * Export a session's graph: choose the writer, build the snapshot it writes, and check it.
 * @param session - The session.
 * @param format - The format id.
 * @param options - The writer's options.
 * @param view - Style, from the renderer.
 * @returns The result.
 * @throws A `GraphtyError`: `E_UNKNOWN_FORMAT`, an option error, the writer's refusal from its
 * `check()` (`E_UNSUPPORTED`), or `E_INTERNAL` when the snapshot could not be built.
 */
export function exportSession(
    session: GraphSession,
    format: FormatId,
    options: ExportGraphOptions = {},
    view: ExportViewState = {},
): ExportResult {
    const writer = writerFor(format, options);
    let built: { snapshot: GraphSnapshot; notes: LossNote[] };
    try {
        built = buildExportSnapshot(session, view, writer.build);
    } catch (error) {
        throw GraphtyError.wrap(error, {
            code: "E_INTERNAL",
            source: "data",
            details: { format, reason: "the graph could not be assembled for export" },
        });
    }

    return writeWith(writer, built.snapshot, format, built.notes);
}

/**
 * Check a snapshot with a chosen writer and hand back the result.
 * @param writer - The writer.
 * @param snapshot - What to write.
 * @param format - The format id.
 * @param notes - Notes the element raised while building the snapshot.
 * @returns The result.
 * @throws A `GraphtyError` with the writer's refusal from its `check()`.
 */
function writeWith(
    writer: ChosenWriter,
    snapshot: GraphSnapshot,
    format: FormatId,
    notes: readonly LossNote[],
): ExportResult {
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
