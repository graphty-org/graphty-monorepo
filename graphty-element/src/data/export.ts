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
 * `graphty.`-prefixed column. A loaded column under that reserved root is reported as
 * `W_GRAPHTY_COLUMN_DROPPED`. A value an algorithm did not measure is left unset, which each format
 * writes as its own "absent".
 *
 * NOTES are left out unless asked for (design/notes/notes-design.md section 7.8). With
 * `{ notes: true }` each node and edge a note names gets two columns, `graphty.notes.count` and
 * `graphty.notes.text`; either way an export of a session holding notes reports
 * `W_GRAPHTY_NOTES`, because no format holds notes as notes.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the renderer hands style in through
 * {@link ExportViewState}.
 */

import { type ColumnDecl, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import {
    type CommonExportOptions,
    type CSV_LOSS,
    csvExporter,
    type CX_LOSS,
    type CX2_LOSS,
    cx2Exporter,
    cxExporter,
    type CYS_LOSS,
    cysExporter,
    type DOT_LOSS,
    dotExporter,
    FormatRegistry,
    type GEXF_LOSS,
    gexfExporter,
    type GML_LOSS,
    gmlExporter,
    type GraphExporter,
    type GRAPHML_LOSS,
    graphmlExporter,
    type JSON_LOSS,
    jsonExporter,
    type LOSS,
    type LossNote,
    type NEO4J_LOSS,
    neo4jExporter,
    type PAJEK_LOSS,
    pajekExporter,
    type XGMML_LOSS,
    xgmmlExporter,
} from "@graphty/graph-io";
import { type ExtractedStyles, STYLE_ISSUE, type StyleRule } from "@graphty/graph-io/styles";

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
import { dispatcherOf } from "../session/GraphSession";
import { rowsOf } from "../session/notes/countIndex";
import { resolveEdgeWeight } from "../session/project/ingest";
import type { CodedFact, CodedFactParam } from "../session/shared";
import type { ExportStyleLossCode } from "../session/styles/fileStyles/codes";
import { layersToStyles } from "../session/styles/fileStyles/fromLayers";
import { asFileStyleStore, FILE_STYLES_VALUE } from "../session/styles/fileStyles/store";
import type { GraphSession } from "../session/types";

export type { ExportStyleLossCode } from "../session/styles/fileStyles/codes";

/** Options of one export: the writer's own, and graph-io's common ones. */
export type ExportGraphOptions = Readonly<Record<string, unknown>> & CommonExportOptions;

/** The codes of one of graph-io's loss tables. */
type CodesOf<Table> = Extract<Table[keyof Table], string>;

/**
 * What a built-in writer could not carry, as the `code` of an {@link ExportLoss}: the codes of
 * graph-io's loss tables for the formats graphty-element writes (`LOSS`, shared by every format,
 * and `CSV_LOSS`, `CX_LOSS`, `CX2_LOSS`, `CYS_LOSS`, `DOT_LOSS`, `GEXF_LOSS`, `GML_LOSS`, `GRAPHML_LOSS`, `JSON_LOSS`,
 * `NEO4J_LOSS`, `PAJEK_LOSS`, `XGMML_LOSS`, each documenting its codes), and graphty-element's
 * own:
 *
 * - `W_GRAPHTY_COLUMN_DROPPED`: a loaded column under the reserved `graphty.` root is left out.
 * - `W_GRAPHTY_NOTES`: the session holds notes, which no format holds as notes; `count` notes.
 * - `W_GRAPHTY_TRUNCATED`: `graphty.notes.text` cells cut to 64 KB; `count` cells.
 * - `W_GRAPHTY_CSV_NEUTRALIZED`: CSV cells a spreadsheet would run as a formula, prefixed with an
 *   apostrophe; `count` cells.
 * - `W_WEIGHT_NOT_NUMERIC`: edge weights that are not numbers, not written; `count` edges.
 * - `W_RESULT_FIELD_DROPPED`: an algorithm result field no column could hold.
 * - The style codes of {@link ExportStyleLossCode}: each names its `target` (`node`, `edge` or
 *   `graph`) and `property` (a neutral property such as `fill`, or `graphty:<channel>` for a
 *   channel only graphty draws, which then also names that `channel`, such as `node.labelColor`)
 *   where it is about one; `W_STYLE_NOT_WRITTEN` counts the elements
 *   that carry a value, `W_STYLE_RULES_NOT_KEPT` the rules, `W_STYLES_NOT_EXPORTED` the layers an
 *   export without `styles: true` left out, and `W_STYLE_LAYER_FLATTENED` adds `layer` (its name)
 *   and `reason` (`SCALE`: a palette or a scale the format cannot express; `RESULT_PATH`: it reads
 *   a value the file does not hold, such as an algorithm result).
 *
 * A code starting `E_` means the writer refuses this graph under these options: `text()` and
 * `bytes` reject. `W_` means the file is written but that part does not read back the same.
 */
export type ExportLossCode =
    | CodesOf<typeof LOSS>
    | CodesOf<typeof CSV_LOSS>
    | CodesOf<typeof CX_LOSS>
    | CodesOf<typeof CX2_LOSS>
    | CodesOf<typeof CYS_LOSS>
    | CodesOf<typeof DOT_LOSS>
    | CodesOf<typeof GEXF_LOSS>
    | CodesOf<typeof GML_LOSS>
    | CodesOf<typeof GRAPHML_LOSS>
    | CodesOf<typeof JSON_LOSS>
    | CodesOf<typeof NEO4J_LOSS>
    | CodesOf<typeof PAJEK_LOSS>
    | CodesOf<typeof XGMML_LOSS>
    | "W_GRAPHTY_COLUMN_DROPPED"
    | "W_GRAPHTY_NOTES"
    | "W_GRAPHTY_TRUNCATED"
    | "W_GRAPHTY_CSV_NEUTRALIZED"
    | "W_WEIGHT_NOT_NUMERIC"
    | "W_RESULT_FIELD_DROPPED"
    | ExportStyleLossCode;

/**
 * One kind of thing an export could not carry, as a code and its values, for the application to
 * word. Every code has the same params:
 *
 * - `columns`: the columns it is about, by name (empty when it is about none, such as the
 *   graph's self-loops); every graph attribute a format has no place for, for instance.
 * - `count`: how many nodes, edges, values or columns are affected, or null when not counted.
 *
 * A style code adds `target` and `property` where it is about one property (and `channel` where
 * that property is a channel only graphty draws), and
 * `W_STYLE_LAYER_FLATTENED` adds `layer` and `reason` (see {@link ExportStyleLossCode}).
 *
 * `code` is an {@link ExportLossCode} for a built-in writer; a writer registered with
 * `registerFormatWriter` reports its own codes.
 */
export type ExportLoss = CodedFact<ExportLossCode | (string & {})>; // NOSONAR(S4335): the open-union idiom; keeps the known codes in autocomplete while accepting a registered writer's

/** What `exportGraph` returns. */
export interface ExportResult {
    /** The format written. */
    readonly format: FormatId;
    /**
     * Everything the export could not carry, one fact per kind of omission, about the table or
     * file actually written (a CSV node table names no edge or graph loss). Empty only when the
     * export is exact.
     */
    readonly losses: readonly ExportLoss[];
    /**
     * Everything the format could not carry, one note per kind of omission, from the exporter's
     * `check()`. Empty only when the export is exact.
     * @deprecated Its `message` is English written by the element. Word {@link ExportResult.losses}
     * instead; removed in the next major release.
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
    json: jsonExporter,
    csv: csvExporter,
    graphml: graphmlExporter,
    gexf: gexfExporter,
    gml: gmlExporter,
    dot: dotExporter,
    pajek: pajekExporter,
    xgmml: xgmmlExporter,
    cx2: cx2Exporter,
    cx: cxExporter,
    cys: cysExporter,
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

/** The note columns `{ notes: true }` writes, after the `graphty.` filter has dropped loaded ones. */
const NOTE_COUNT: ColumnDecl = { name: "graphty.notes.count", dtype: "i32", nullable: true };
const NOTE_TEXT = "graphty.notes.text";
/** The most UTF-8 bytes one `graphty.notes.text` cell holds. */
const NOTE_TEXT_BYTES = 65_536;

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
 * @param dropped - Counts, per `graphty.` column left out, the values it held.
 * @returns The attributes.
 */
function attributesOf(
    record: Readonly<Record<string, unknown>>,
    skip: ReadonlySet<string>,
    cell: <T>(value: T) => T | string,
    dropped: Map<string, number>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (skip.has(key) || value === undefined || value === null) {
            continue;
        }

        if (key.startsWith(INTERNAL_PREFIX)) {
            dropped.set(key, (dropped.get(key) ?? 0) + 1);
        } else {
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
    /** Write the note columns. The `notes` option every writer takes; off by default. */
    readonly notes?: boolean;
    /** The writer writes the node table alone (a CSV node table): report no edge or graph loss. */
    readonly nodesOnly?: boolean;
    /** Write the graph's styles through the format's style writer. The `styles` option every writer takes; off by default. */
    readonly styles?: boolean;
}

/** A loss note the element raised, with the facts its coded form carries beyond graph-io's. */
type ElementLossNote = LossNote & { readonly params?: Readonly<Record<string, CodedFactParam>> };

/**
 * Cut a text to at most a number of UTF-8 bytes, never inside a code point.
 * @param text - The text.
 * @param limit - The most bytes.
 * @returns The text, or its longest prefix that fits; and whether it was cut.
 */
function cutToBytes(text: string, limit: number): { text: string; cut: boolean } {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length <= limit) {
        return { text, cut: false };
    }

    // Back off to the first byte of a code point: a continuation byte is 10xxxxxx.
    let end = limit;
    while ((bytes[end] & 0xc0) === 0x80) {
        end--;
    }

    return { text: new TextDecoder().decode(bytes.subarray(0, end)), cut: true };
}

/**
 * Write the note columns: per node and edge row a note names, how many notes name it and their
 * text, newest first, joined by a blank line.
 * @param session - The session.
 * @param builder - The export's builder, rows in the session's order.
 * @param lossNotes - Receives `W_GRAPHTY_TRUNCATED` for each cut cell.
 * @param cell - What each text value goes through.
 */
function writeNotes(
    session: GraphSession,
    builder: GraphBuilder,
    lossNotes: LossNote[],
    cell: <T>(value: T) => T | string,
): void {
    // `list()` is newest first, so each row's texts arrive in the order they are written.
    const notes = session.notes.list();
    const texts = { node: new Map<number, string[]>(), edge: new Map<number, string[]>() };
    rowsOf(notes, session.data.snapshot()).forEach((rows, at) => {
        const seen = { node: new Set<number>(), edge: new Set<number>() };
        rows.forEach((row, position) => {
            const kind = "node" in notes[at].targets[position] ? "node" : "edge";
            if (row === undefined || row < 0 || seen[kind].has(row)) {
                return;
            }

            seen[kind].add(row);
            const held = texts[kind].get(row);
            if (held === undefined) {
                texts[kind].set(row, [notes[at].text]);
            } else {
                held.push(notes[at].text);
            }
        });
    });

    let cut = 0;
    const count = { node: builder.declareNodeColumn(NOTE_COUNT), edge: builder.declareEdgeColumn(NOTE_COUNT) };
    for (const kind of ["node", "edge"] as const) {
        const set = kind === "node" ? builder.setNodeValue.bind(builder) : builder.setEdgeValue.bind(builder);
        for (const [row, list] of texts[kind]) {
            const text = cutToBytes(list.join("\n\n"), NOTE_TEXT_BYTES);
            cut += text.cut ? 1 : 0;
            set(count[kind], row, list.length);
            set(NOTE_TEXT, row, cell(text.text));
        }
    }

    if (cut > 0) {
        lossNotes.push({
            code: "W_GRAPHTY_TRUNCATED",
            message: `${String(cut)} ${NOTE_TEXT} cell(s) were cut to 64 KB`,
            column: NOTE_TEXT,
            count: cut,
        });
    }
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
    let neutralised = 0;
    const cell =
        options.neutraliseFormulas === true
            ? <T>(value: T): T | string => {
                  const written = neutraliseFormula(value);
                  neutralised += written === value ? 0 : 1;
                  return written;
              }
            : <T>(value: T): T => value;
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
    // A loaded column under the reserved `graphty.` root is left out, never silently.
    const dropped = new Map<string, number>();
    for (const record of nodes) {
        builder.addNodeRecord(cell(record.id), attributesOf(record, nodeSkip, cell, dropped));
    }

    // An edge's reserved columns are counted only when the edges are written.
    const edgeDropped = options.nodesOnly === true ? new Map<string, number>() : dropped;

    // The weight is the one the element stores and runs on -- read through edgeWeightPath, then
    // the legacy `value` key, and folded under a repeatedEdges policy -- not the record's literal
    // `weight`. Every exporter writes the weight role under its format's own weight name; the
    // record's own keys (a custom weight path, `value`) are written as the attributes they are.
    const weightKey = "weight";
    const { weights, edgeToArc } = current;
    let unweighable = 0;
    edges.forEach((record, row) => {
        const attributes = attributesOf(record, edgeSkip, cell, edgeDropped);
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

    if (unweighable > 0 && options.nodesOnly !== true) {
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

    for (const [column, count] of dropped) {
        notes.push({
            code: "W_GRAPHTY_COLUMN_DROPPED",
            message:
                `The column ${JSON.stringify(column)} was left out: names under graphty. are reserved for ` +
                `values graphty-element provides`,
            column,
            count,
        });
    }

    writeResults(session, builder, options.nodesOnly === true ? [] : notes, cell);
    const held = session.notes.counts().notes;
    if (held > 0) {
        if (options.notes === true) {
            writeNotes(session, builder, notes, cell);
        }

        notes.push({
            code: "W_GRAPHTY_NOTES",
            message:
                options.notes === true
                    ? `${String(held)} note(s) are not carried as notes: only their text is, in the ` +
                      `graphty.notes.count and graphty.notes.text columns. Save them with notes.toDocument()`
                    : `${String(held)} note(s) were left out. Export with { notes: true } to write their text ` +
                      `as columns, or save them with notes.toDocument()`,
            column: null,
            count: held,
        });
    }

    if (neutralised > 0) {
        notes.push({
            code: "W_GRAPHTY_CSV_NEUTRALIZED",
            message: `${String(neutralised)} cell(s) a spreadsheet would run as a formula were prefixed with an apostrophe`,
            column: null,
            count: neutralised,
        });
    }

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
    // `notes` and `styles` are the element's own options; no exporter reads them as they are.
    const { notes, styles, ...resolved } = resolveOptionValues(declared, options, { kind: "format", id: format });
    if (format !== "csv") {
        return {
            exporter: builtIn ?? (registered as FormatWriterRegistration).exporter,
            options: resolved,
            build: { notes: notes === true, styles: styles === true },
        };
    }

    // `variant` picks the writer and `neutraliseFormulas` is the element's own guard; graph-io
    // reads neither. CSV's `dialect` defaults to the plain one (see the catalogue entry): the
    // element's CSV reader reads Gephi's capitalised headers back under those names.
    const { variant: _variant, neutraliseFormulas, ...rest } = resolved;
    return {
        exporter: neo4j ? neo4jExporter : builtIn,
        options: rest,
        build: {
            neutraliseFormulas: neutraliseFormulas !== false,
            notes: notes === true,
            nodesOnly: !neo4j && rest.table === "nodes",
            styles: styles === true,
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
    let styles: StylesToWrite | null = null;
    try {
        // With styles, the style writer is the only path: the drawn colour, size and width columns are left out.
        built = buildExportSnapshot(session, writer.build.styles === true ? {} : view, writer.build);
        if (writer.build.styles === true) {
            styles = sessionStyles(session, built.snapshot, writer.exporter.format);
        }
    } catch (error) {
        throw GraphtyError.wrap(error, {
            code: "E_INTERNAL",
            source: "data",
            details: { format, reason: "the graph could not be assembled for export" },
        });
    }

    if (styles !== null) {
        return writeWith(writer, built.snapshot, format, [...built.notes, ...styles.notes], styles);
    }

    const layers = ownLayers(session);
    const notExported: ElementLossNote[] =
        layers === 0
            ? []
            : [
                  {
                      code: STYLE_ISSUE.NOT_EXPORTED,
                      message: `${String(layers)} style layer(s) were not written. Export with { styles: true } to write them`,
                      column: null,
                      count: layers,
                  },
              ];
    return writeWith(writer, built.snapshot, format, [...built.notes, ...notExported]);
}

/**
 * How many layers of the session's own the stack holds: every layer but the element's.
 * @param session - The session.
 * @returns The count.
 */
function ownLayers(session: GraphSession): number {
    return session.styles.list().filter((layer) => layer.source.by !== "element").length;
}

/** The session's styles as an export writes them. */
interface StylesToWrite {
    /** The styles. */
    readonly extracted: ExtractedStyles;
    /** The element's own notes about them. */
    readonly notes: ElementLossNote[];
    /** The rules the element's base layers became. */
    readonly base: readonly { readonly target: string; readonly id: string }[];
}

/**
 * The session's layers as the styles graph-io writes, and what they lose on the way.
 * @param session - The session.
 * @param snapshot - The snapshot being written, rows in the session's order.
 * @param format - The format written.
 * @returns The styles and the element's own notes about them.
 */
function sessionStyles(session: GraphSession, snapshot: GraphSnapshot, format: string): StylesToWrite {
    const { state } = dispatcherOf(session);
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    const nodeMask = session.visibility.nodeMask();
    const edgeMask = session.visibility.edgeMask();
    const rowOf = new Map(nodes.map((record, row) => [record.id, row]));
    const shown = (id: unknown): boolean => {
        const row = rowOf.get(id as never);
        return row === undefined || nodeMask[row] === 1;
    };
    const result = layersToStyles({
        stack: state.styles,
        snapshot,
        ids: { node: nodes.map((record) => record.id), edge: edges.map((record) => record.id) },
        explain: (target) => session.styles.explain(target),
        hidden: {
            node: nodes.map((_record, row) => nodeMask[row] !== 1),
            // An edge hidden only because an end of it is hidden comes back with that end.
            edge: edges.map((record, row) => edgeMask[row] !== 1 && shown(record.source) && shown(record.target)),
        },
        fileStyles: asFileStyleStore(state.graph.values.get(FILE_STYLES_VALUE)),
        format,
    });
    const notes: ElementLossNote[] = [
        ...result.flattened.map((flat) => ({
            code: STYLE_ISSUE.LAYER_FLATTENED,
            message: `the layer ${JSON.stringify(flat.layer)} is written as the ${flat.target} ${flat.property} values it paints, not as a rule (${flat.reason})`,
            column: null,
            count: flat.count,
            style: { target: flat.target, property: flat.property as never },
            params: { layer: flat.layer, reason: flat.reason },
        })),
        ...result.unwritten.map((lost) => ({
            code: STYLE_ISSUE.NOT_WRITTEN,
            message: `${lost.target} ${lost.property} is not written: no file value holds it`,
            column: null,
            count: lost.count,
            style: { target: lost.target, property: lost.property as never },
        })),
    ];
    return { extracted: result.extracted, notes, base: result.base };
}

/**
 * `{ channel }` for a property only graphty draws (`graphty:node.labelColor`), so an application
 * reads the channel without taking the property apart; nothing for any other.
 * @param property - The loss's style property.
 * @returns The param, or none.
 */
function channelOf(property: string | undefined): { channel?: string } {
    return property?.startsWith("graphty:") === true ? { channel: property.slice("graphty:".length) } : {};
}

/**
 * A loss note as a fact: its code, the columns it names and its count.
 * @param note - The note.
 * @returns The fact, frozen.
 */
function lossOf(note: ElementLossNote): ExportLoss {
    const columns = note.columns ?? (note.column === null ? [] : [note.column]);
    return Object.freeze({
        code: note.code,
        params: Object.freeze({
            columns: Object.freeze([...columns]),
            count: note.count,
            ...(note.style === undefined ? {} : { target: note.style.target, property: note.style.property }),
            ...channelOf(note.style?.property),
            ...note.params,
        }),
    });
}

/**
 * The style losses of an export, less those about the element's own base layers: loading the file
 * into graphty draws the same base again, so a property only they paint is not lost, and their
 * rules are not rules a reader made.
 * @param checked - The notes graph-io gave.
 * @param styles - The styles written.
 * @param base - The rules the element's base layers became.
 * @returns The notes that name something lost.
 */
function withoutBaseLosses(
    checked: readonly LossNote[],
    styles: ExtractedStyles,
    base: readonly { readonly target: string; readonly id: string }[],
): LossNote[] {
    const isBase = (rule: StyleRule): boolean => base.some((one) => one.target === rule.target && one.id === rule.id);
    const writes = (rule: StyleRule, property: string): boolean =>
        Object.hasOwn(rule.set ?? {}, property) || Object.hasOwn(rule.map ?? {}, property);
    const baseOnly = (target: string, property: string): boolean => {
        const writers = styles.styles.rules.filter((rule) => rule.target === target && writes(rule, property));
        return writers.length > 0 && writers.every(isBase);
    };
    const baseRules = styles.styles.rules.filter(isBase).length;
    const out: LossNote[] = [];
    for (const note of checked) {
        if (note.code === STYLE_ISSUE.RULES_NOT_KEPT && note.count !== null) {
            const count = note.count - baseRules;
            if (count > 0) {
                out.push(Object.freeze({ ...note, count }));
            }
        } else if (note.style === undefined || !baseOnly(note.style.target, note.style.property)) {
            out.push(note);
        }
    }

    return out;
}

/**
 * Check a snapshot with a chosen writer and hand back the result.
 * @param writer - The writer.
 * @param snapshot - What to write.
 * @param format - The format id.
 * @param notes - Notes the element raised while building the snapshot.
 * @param written - The styles to write, when the export asked for them.
 * @returns The result.
 * @throws A `GraphtyError` with the writer's refusal from its `check()`.
 */
function writeWith(
    writer: ChosenWriter,
    snapshot: GraphSnapshot,
    format: FormatId,
    notes: readonly ElementLossNote[],
    written?: StylesToWrite,
): ExportResult {
    const { exporter } = writer;
    const styles = written?.extracted;
    // With styles, graph-io works out what the format's style writer receives and loses.
    const registry = styles === undefined ? null : new FormatRegistry().registerExporter(exporter);
    const options = styles === undefined ? writer.options : { ...writer.options, styles };
    let checked: readonly LossNote[];
    try {
        checked =
            registry === null
                ? exporter.check(snapshot, options)
                : registry.checkExport(snapshot, exporter.format, options);
    } catch (error) {
        throw writerFailure(error, format);
    }

    const lossNotes = Object.freeze([
        ...notes,
        ...(written === undefined ? checked : withoutBaseLosses(checked, written.extracted, written.base)),
    ]);
    return {
        format,
        losses: Object.freeze(lossNotes.map(lossOf)),
        lossNotes,
        async text(): Promise<string> {
            try {
                return registry === null
                    ? await exporter.exportToString(snapshot, options)
                    : await registry.exportGraphToString(snapshot, exporter.format, options);
            } catch (error) {
                throw writerFailure(error, format);
            }
        },
        bytes: {
            async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
                try {
                    yield* registry === null
                        ? exporter.export(snapshot, options)
                        : registry.exportGraph(snapshot, exporter.format, options);
                } catch (error) {
                    throw writerFailure(error, format);
                }
            },
        },
    };
}
