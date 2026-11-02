/**
 * The JSON exporter (design section 8.5): one GraphExporter with a `dialect` option writing
 * NetworkX node-link (the default), d3 (`links`, optional index endpoints), JSON Graph Format v2,
 * Cytoscape.js elements, graphology serialization or vis.js. The dialect defaults to the one the
 * importer recorded under `meta.extra.json` so a JSON file re-exported as JSON keeps its shape,
 * and to node-link for a snapshot from any other source.
 *
 * check() runs the generic capability pre-flight against the dialect's table and appends the
 * dialect-specific notes (non-finite numbers written as null, JGF id stringification / collisions
 * / node order, direction dropped by Cytoscape and vis, mutual pairs expanded, reserved key
 * collisions, positions written as plain attributes, a Cytoscape `parents` column) before anything
 * is written; the same column plan drives write(), so the notes and the output agree.
 *
 * Every column without a structural slot in the dialect is written as a plain attribute under its
 * column name; an f32 value is written as the shortest decimal that round-trips through
 * Math.fround (design section 3.7); a multi-component value is an array; a list is an array; a json
 * value is its JSON text; an unset row writes no key (design section 5.3). Non-finite numbers,
 * which JSON cannot carry, become null and are reported.
 */

import { type Column, GraphFormatError, type GraphSnapshot, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { DIRECTION_DROPPED_CODE, NODE_ORDER_CODE, NONFINITE_AS_NULL_CODE } from "../../common/codes.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { checkCapabilities, countMixedEdges, LOSS } from "../../common/export.js";
import { formatF32, formatF64 } from "../../common/format.js";
import { flipY } from "../../common/json-elements.js";
import { otherFormatDialect, type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { explicitWeights } from "../../common/weights.js";
import { encodeChunks, indentUnit, joinText } from "../../common/writer.js";
import { STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import type { ExporterStyleOptions } from "../../styles/io/writer.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import {
    CYTOSCAPE_ELEMENT_KEYS,
    DIALECT_DEFAULT_DIRECTED,
    dialectCapabilities,
    exponentIfUnsafe,
    isJsonDialect,
    JSON_DIALECTS,
    type JsonDialect,
    type JsonShapeMeta,
    shapeMetaOf,
    SUFFIX,
} from "./dialect.js";
import { OBOGRAPHS_LOSS, OBOGRAPHS_SHARED_LOSS, planObographs } from "./obographs-export.js";
import { JSON_STYLE_CAPABILITIES, type JsonStyledExport, jsonStyledExport, STYLE_KEY_REPLACED_CODE } from "./styles.js";

/** What the writer takes: the format's options, the common ones and the styles. */
type JsonWriteOptions = JsonExportOptions & CommonExportOptions & ExporterStyleOptions;

/**
 * The format-specific options of the JSON exporter.
 * @category Built-in formats
 */
export interface JsonExportOptions extends CommonExportOptions {
    /**
     * The dialect to write. The default is the dialect a JSON import read, else "node-link".
     * Attributes are written under their own names; vis.js shows the `label` attribute, so rename
     * the attribute you want shown to `label` first (`snapshot.nodes.rename("name", "label")`). A CSV
     * dialect name ("gephi", "generic"), from an options object shared with CSV saves, is ignored.
     * @defaultValue as read, else "node-link"
     */
    dialect?: JsonDialect | undefined;
    /**
     * The indentation of one level: a number of spaces, or the text itself (spaces or tabs, such as
     * "\t"). 0 or "" writes compact JSON on one line.
     * @defaultValue 0
     */
    indent?: number | string | undefined;
    /**
     * node-link and d3: the key of the edge array. The default is the key a JSON import read, else
     * "edges" ("links" for d3).
     * @defaultValue as read, else "edges"
     */
    edgesKey?: string | undefined;
    /**
     * node-link, d3 and vis: the node id key. The default is the key a JSON import read, else "id".
     * @defaultValue as read, else "id"
     */
    nodeIdKey?: string | undefined;
    /**
     * node-link and d3: write edge ends as positions in the node array instead of ids. The default
     * is what a JSON import read, else false.
     * @defaultValue as read, else false
     */
    indexLinks?: boolean | undefined;
    /**
     * node-link, d3 and vis: the source key. The default is the key a JSON import read, else
     * "source" ("from" for vis). graph-io finds "source", "src" and "from" by itself; for another
     * key, read the file back with the same `sourceKey` import option. Without it every edge is an
     * `E_MISSING_ENDPOINT` error and is skipped, and a file with more edges than `errorLimit` (100 by
     * default) fails to load with an `ImportError`. `checkExport()` does not warn about this.
     * @defaultValue as read, else "source"
     */
    sourceKey?: string | undefined;
    /**
     * node-link, d3 and vis: the target key. The default is the key a JSON import read, else
     * "target" ("to" for vis). graph-io finds "target", "dst" and "to" by itself; for another key,
     * read the file back with the same `targetKey` import option, as for `sourceKey`.
     * @defaultValue as read, else "target"
     */
    targetKey?: string | undefined;
    /**
     * The key the weight is written under, in every dialect but OBO Graphs, which always writes the
     * weight as "weight" in each edge's `meta` (checkExport() then returns W_OBOGRAPHS_EDGE_COLUMN_AS_META).
     * The default is the key a JSON import read the weights from, else "weight". For another key,
     * read the file back with `weightFrom` set to it, or the weights come back as a plain edge
     * attribute.
     * @defaultValue as read, else "weight"
     */
    weightKey?: string | undefined;
    /**
     * OBO Graphs: the graph id written when the graph has none. A graph read from an OBO Graphs
     * document keeps its own graph id, which this option does not change. Node ids are written in
     * the form graph-io reads back as the same id: an IRI as it is, a prefixed id such as
     * `GO:0008150` as its OBO address, and an id without a prefix (`a`) under the default OBO
     * address (`http://purl.obolibrary.org/obo/graph.owl#a`), or as it is when you pass another IRI
     * here. The default is `http://purl.obolibrary.org/obo/<ontology>.owl`.
     * @defaultValue the ontology's OBO address
     */
    ontologyIri?: string | undefined;
}

/**
 * The LossNote codes of the JSON exporter's check(): the dialect-specific ones and, aliased, the
 * shared ones it records (`LOSS` holds the rest of the generic pre-flight's codes). A key is the
 * code without its severity prefix.
 * @category Built-in formats
 */
export const JSON_LOSS = Object.freeze({
    /** Non-finite numbers (columns, weights) are written as null. */
    NONFINITE_AS_NULL: NONFINITE_AS_NULL_CODE,
    /**
     * The file cannot record direction: an undirected graph's edges read back as directed, or the whole graph reads
     * back with the importer's default direction.
     */
    DIRECTION_DROPPED: DIRECTION_DROPPED_CODE,
    /** GEXF mutual pairs are written as two directed edges. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /**
     * JGF keys its nodes by text, so number ids read back as text, unless you read the file with `ids: "canonical"`.
     */
    NUMERIC_IDS_STRINGIFIED: "W_NUMERIC_IDS_STRINGIFIED",
    /**
     * Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with
     * E_INVALID_ID.
     */
    ID_TEXT_COLLISION: LOSS.ID_TEXT_COLLISION,
    /** The nodes read back in a different order. */
    NODE_ORDER: NODE_ORDER_CODE,
    /** A column named like a reserved key of the dialect (id, source, target, ...) is skipped. */
    RESERVED_KEY: "W_RESERVED_KEY",
    /**
     * An attribute without the weight role is named like the key weights are written under; it reads back as the edge
     * weight, or is not written when the graph has weights of its own.
     */
    WEIGHT_KEY_CLASH: LOSS.WEIGHT_KEY_CLASH,
    /** A position column without a slot (every dialect but Cytoscape) is a plain array attribute; the role is lost. */
    POSITIONS_DROPPED: LOSS.POSITIONS,
    /** Cytoscape positions are 2D; non-zero z values are dropped. */
    POSITION_Z_DROPPED: "W_POSITION_Z_DROPPED",
    /** Cytoscape has a single parent; a `parents` list column cannot be written. */
    PARENTS_DROPPED: LOSS.PARENTS,
    /** Node-link / d3 have no edge id slot; the id column is written as a plain attribute. */
    EDGE_IDS_DROPPED: LOSS.EDGE_IDS_DROPPED,
    /**
     * A number attribute whose values are all whole numbers reads back as integers, because the format does not record
     * the type.
     */
    INTEGRAL_F64_AS_I32: LOSS.INTEGRAL_F64,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: LOSS.ROLE,
    /** A column without a set cell is not written (JSON declares no columns). */
    EMPTY_COLUMN_DROPPED: LOSS.EMPTY_COLUMN,
    /**
     * Obographs: an edge column (or the explicit weights) is written into each edge's meta and reads back inside the
     * meta column.
     */
    OBOGRAPHS_EDGE_COLUMN_AS_META: OBOGRAPHS_LOSS.EDGE_COLUMN_AS_META,
    /**
     * Obographs: a node id or relation is written as an IRI the importer's default oboIds "curie" reads back as
     * another id.
     */
    OBOGRAPHS_ID_CHANGED: OBOGRAPHS_LOSS.ID_CHANGED,
    /** Obographs: a property_value's xsd datatype has no place in basicPropertyValues and reads back unset. */
    OBOGRAPHS_DATATYPE_DROPPED: OBOGRAPHS_LOSS.DATATYPE_DROPPED,
    /** Obographs: a graph without a node type column is written with CLASS nodes and reads back with a type column holding Term. */
    OBOGRAPHS_TYPE_GAINED: OBOGRAPHS_LOSS.TYPE_GAINED,
    /** Obographs: a node column outside the OBO vocabulary reads back inside the property_value column. */
    COLUMN_AS_PROPERTY_VALUE: OBOGRAPHS_SHARED_LOSS.COLUMN_AS_PROPERTY_VALUE,
    /** Obographs: an edge without a relation is written with the pred is_a. */
    RELATION_ASSUMED: OBOGRAPHS_SHARED_LOSS.RELATION_ASSUMED,
    /**
     * Obographs: Typedef nodes are written as PROPERTY nodes, which read back as nodes only under typedefs: "nodes".
     */
    TYPEDEF_NODES: OBOGRAPHS_SHARED_LOSS.TYPEDEF_NODES,
    /**
     * OBO Graphs: a graph attribute is written into the graph's `meta` and reads back in
     * `snapshot.meta.extra.obographs`.
     */
    GRAPH_COLUMN_AS_METADATA: OBOGRAPHS_SHARED_LOSS.GRAPH_COLUMN_AS_METADATA,
    /** Obographs: numeric node ids are written as text and read back as strings. */
    ID_TEXT_TYPE: LOSS.ID_TEXT_TYPE,
    /**
     * An attribute without a role is written where the format keeps a role (for example, a `name` column as the label), and
     * reads back with that role.
     */
    ROLE_ASSUMED: LOSS.ROLE_ASSUMED,
    /**
     * An attribute with a role (for example, the label) is written where the format keeps that role, and reads back under the
     * name the format's importer gives it.
     */
    COLUMN_NAME_CHANGED: LOSS.COLUMN_NAME_CHANGED,
    /**
     * OBO Graphs: an OBO attribute stored as text where graph-io uses a dictionary (or the other way round); it reads
     * back with graph-io's usual type. The values are the same.
     */
    DTYPE_UNSUPPORTED: LOSS.DTYPE,
    /**
     * Saving with styles: a column named like one of the dialect's style keys (graphology's `color`, `size`, `label`,
     * vis.js's `color`, `shape`, `font`, ...) is written with what graphty draws, so the values it held differ.
     */
    STYLE_KEY_REPLACED: STYLE_KEY_REPLACED_CODE,
});

/** The roles each dialect has a slot for (every other role column is a plain attribute, reported by checkCapabilities()). */
const SLOT_ROLES: Readonly<Record<JsonDialect, ReadonlySet<string>>> = Object.freeze({
    "node-link": new Set<string>(),
    d3: new Set<string>(),
    jgf: new Set(["label", "kind"]),
    cytoscape: new Set(["classes"]),
    graphology: new Set<string>(),
    vis: new Set<string>(),
    obographs: new Set(["label", "kind"]),
});

/** The element domains. */
type Domain = "node" | "edge" | "graph";

/** A note-recording callback. */
type NoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/** The roles the pre-flight treats structurally; never written as attributes. */
const STRUCTURAL_ROLES: ReadonlySet<string> = new Set([
    "directed",
    "pair",
    "mutual",
    "weight",
    "timeText",
    "originalId",
]);

/** The roles no JSON dialect can carry; skipped (checkCapabilities reports them). */
const TEMPORAL_ROLES: ReadonlySet<string> = new Set([
    "start",
    "end",
    "timestamp",
    "timestamps",
    "spells",
    "open",
    "spellsOpen",
]);

/** The dialects whose attributes live in a nested dict (data / metadata / attributes). */
const NESTED_DIALECTS: ReadonlySet<JsonDialect> = new Set(["jgf", "cytoscape", "graphology"]);

/** A mutable counter of the non-finite numbers written as null. */
interface Counter {
    count: number;
}

/** How one column is written. */
type Slot = "attribute" | "element" | "position" | "cytoscapePosition" | "parent" | "classes" | "label" | "relation";

/** One column's place in the output. */
interface ColumnPlan {
    readonly column: Column;
    /** The output key (attribute or element-level key). */
    readonly key: string;
    readonly slot: Slot;
}

/** The resolved exporter options. */
interface Resolved {
    readonly common: ResolvedExportOptions;
    readonly dialect: JsonDialect;
    readonly indent: string;
    readonly edgesKey: string;
    readonly nodeIdKey: string | null;
    readonly indexLinks: boolean;
    readonly sourceKey: string;
    readonly targetKey: string;
    readonly weightKey: string;
    readonly shape: JsonShapeMeta;
    readonly ontologyIri: string | null;
    /** The styles being written, worked out for the dialect; absent without styles. */
    readonly styled?: JsonStyledExport;
}

/** Everything write() needs, computed once by plan(). */
interface Plan {
    readonly resolved: Resolved;
    readonly notes: LossNote[];
    readonly nodes: readonly ColumnPlan[];
    readonly edges: readonly ColumnPlan[];
    readonly graph: readonly ColumnPlan[];
    /** The id-role edge column, or null. */
    readonly edgeIds: Column | null;
    /** The weight of an edge as JSON text, or null when the edge has no explicit weight. */
    readonly weights: (e: number) => string | null;
    /** The pair folding (design section 3.6): mirrors skipped, source directions. */
    readonly folding: PairFolding;
    /** The file-level direction. */
    readonly directed: boolean;
    /** Whether the file declares a multigraph. */
    readonly multigraph: boolean;
}

/**
 * Resolve the options against the snapshot's recorded shape.
 * @param snapshot - the snapshot
 * @param options - the caller's options
 * @returns the resolved options; E_UNSUPPORTED for a bad value
 */
function resolve(snapshot: GraphSnapshot, options: (JsonExportOptions & CommonExportOptions) | undefined): Resolved {
    const o = options ?? {};
    const common = resolveExportOptions(options);
    const shape = shapeMetaOf(snapshot.meta);
    let dialect: JsonDialect;
    if (o.dialect === undefined || otherFormatDialect("json", o.dialect)) {
        // no dialect, or another format's (a CSV "generic" in a shared options object)
        dialect = shape.dialect ?? "node-link";
    } else if (isJsonDialect(o.dialect)) {
        ({ dialect } = o);
    } else {
        throw unsupported("dialect", o.dialect, JSON_DIALECTS);
    }
    const indent = indentUnit(o.indent, "");
    const sameDialect = shape.dialect === dialect;
    const recorded = <T>(value: T | undefined, fallback: T): T =>
        sameDialect && value !== undefined ? value : fallback;
    const edgesKey =
        keyOption("edgesKey", o.edgesKey) ?? recorded(shape.edgesKey, dialect === "d3" ? "links" : "edges");
    let nodeIdKey: string | null;
    if (o.nodeIdKey !== undefined) {
        nodeIdKey = keyOption("nodeIdKey", o.nodeIdKey);
    } else if (sameDialect && shape.nodeIdKey !== undefined) {
        ({ nodeIdKey } = shape);
    } else {
        nodeIdKey = "id";
    }
    let indexLinks = o.indexLinks ?? recorded(shape.indexLinks, false);
    if (typeof indexLinks !== "boolean") {
        throw unsupported("indexLinks", indexLinks, ["true", "false"]);
    }
    if (nodeIdKey === null) {
        // positional nodes have no id to write; endpoints must be positions
        indexLinks = true;
    }
    const sourceKey =
        keyOption("sourceKey", o.sourceKey) ?? recorded(shape.sourceKey, dialect === "vis" ? "from" : "source");
    const targetKey =
        keyOption("targetKey", o.targetKey) ?? recorded(shape.targetKey, dialect === "vis" ? "to" : "target");
    const { weightOrigin } = snapshot.meta;
    const weightKey =
        keyOption("weightKey", o.weightKey) ??
        (weightOrigin !== null && weightOrigin.format === "json" && weightOrigin.id !== null
            ? weightOrigin.id
            : "weight");
    const ontologyIri = keyOption("ontologyIri", o.ontologyIri);
    return {
        common,
        dialect,
        indent,
        edgesKey,
        nodeIdKey,
        indexLinks,
        sourceKey,
        targetKey,
        weightKey,
        shape,
        ontologyIri,
    };
}

/**
 * Check a key-valued option.
 * @param name - the option name
 * @param value - the caller's value
 * @returns the key, or null when absent
 */
function keyOption(name: string, value: unknown): string | null {
    if (value === undefined) {
        return null;
    }
    if (typeof value !== "string" || value.length === 0) {
        throw unsupported(name, value, ["a non-empty key"]);
    }
    return value;
}

/**
 * The E_UNSUPPORTED error of a bad option.
 * @param name - the option name
 * @param found - the value
 * @param supported - what is accepted
 * @returns the error
 */
function unsupported(name: string, found: unknown, supported: readonly string[]): GraphFormatError {
    const shown = typeof found === "string" ? JSON.stringify(found) : String(found);
    return new GraphFormatError("E_UNSUPPORTED", `option ${name}: ${shown} is not one of ${supported.join(", ")}`, {
        option: name,
        found: typeof found === "string" || typeof found === "number" ? found : typeof found,
        supported: [...supported],
    });
}

// ============================================================ value formatting

/**
 * The JSON text of a finite or non-finite number; non-finite values become null and are counted.
 * @param value - the number
 * @param f32 - whether the value came from an f32 store (shortest fround-round-trip text)
 * @param nonfinite - the counter of null-ed values
 * @returns the JSON text
 */
function numberText(value: number, f32: boolean, nonfinite: Counter): string {
    if (!Number.isFinite(value)) {
        nonfinite.count++;
        return "null";
    }
    // -0 is a JSON number too ("-0"); JSON.parse reads it back as -0
    return exponentIfUnsafe(f32 ? formatF32(value) : formatF64(value));
}

/**
 * The JSON text of any cell value: a number per its dtype, a boolean, a string, an array (a
 * multi-component subarray or a list row), or a json value.
 * @param value - the value
 * @param f32 - whether numbers come from an f32 store
 * @param nonfinite - the counter of null-ed values
 * @returns the JSON text
 */
function valueText(value: unknown, f32: boolean, nonfinite: Counter): string {
    switch (typeof value) {
        case "number":
            return numberText(value, f32, nonfinite);
        case "boolean":
            return value ? "true" : "false";
        case "string":
            return JSON.stringify(value);
        case "undefined":
            return "null";
        default:
            break;
    }
    if (value === null) {
        return "null";
    }
    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
        const items = Array.from(value as ArrayLike<unknown>, (item) => valueText(item, f32, nonfinite));
        return `[${items.join(",")}]`;
    }
    // ponytail: numbers nested in a json object are written by JSON.stringify, so an integral one
    // beyond 2^53 re-imports as its digit text; walk the object here if that ever matters
    const text = JSON.stringify(value);
    return text === undefined ? "null" : text;
}

/**
 * The JSON text of one set cell.
 * @param column - the column
 * @param row - the row
 * @param ids - the snapshot's id map (for refersTo node columns)
 * @param nonfinite - the counter of null-ed values
 * @returns the JSON text
 */
function cellText(column: Column, row: number, ids: GraphSnapshot["ids"], nonfinite: Counter): string {
    switch (column.dtype) {
        case "list":
            return valueText(column.sliceOf(row), column.child.dtype === "f32", nonfinite);
        case "json":
            return valueText(column.values[row], false, nonfinite);
        case "u32":
            if (column.meta.refersTo === "node" && column.meta.components === 1) {
                const index = column.data[row];
                return index === INVALID_INDEX ? "null" : idText(ids.idOf(index));
            }
            return valueText(column.value(row), false, nonfinite);
        case "f32":
            return valueText(column.value(row), true, nonfinite);
        default:
            return valueText(column.value(row), false, nonfinite);
    }
}

/**
 * How many cells of a column hold a non-finite number (f32 / f64 columns, their components and
 * lists of them).
 * @param column - the column
 * @returns the count
 */
function countNonFinite(column: Column): number {
    let data: ArrayLike<number>;
    switch (column.dtype) {
        case "f32":
        case "f64":
            ({ data } = column);
            break;
        case "list":
            if (column.child.dtype !== "f32" && column.child.dtype !== "f64") {
                return 0;
            }
            ({ data } = column.child);
            break;
        default:
            return 0;
    }
    let count = 0;
    for (let i = 0; i < data.length; i++) {
        if (!Number.isFinite(data[i])) {
            count++;
        }
    }
    return count;
}

// ============================================================ the writer

/**
 * Emits JSON tokens with optional indentation, accumulating text parts the generator yields one
 * element at a time.
 */
class JsonWriter {
    private parts: string[] = [];

    private depth = 0;

    private readonly firstAtDepth: boolean[] = [];

    private readonly indent: string;

    /**
     * Create a writer.
     * @param indent - the text of one level; "" for compact output
     */
    constructor(indent: string) {
        this.indent = indent;
    }

    /**
     * Open an object or an array.
     * @param bracket - "{" or "["
     */
    open(bracket: "{" | "["): void {
        this.parts.push(bracket);
        this.depth++;
        this.firstAtDepth.push(true);
    }

    /**
     * Close the innermost object or array.
     * @param bracket - "}" or "]"
     */
    close(bracket: "}" | "]"): void {
        const wasEmpty = this.firstAtDepth.pop() ?? true;
        this.depth--;
        if (!wasEmpty) {
            this.parts.push(this.newline());
        }
        this.parts.push(bracket);
    }

    /**
     * Start an object member: the separator and the quoted key.
     * @param name - the key
     */
    key(name: string): void {
        this.separator();
        this.parts.push(JSON.stringify(name), this.indent !== "" ? ": " : ":");
    }

    /** Start an array element: the separator only. */
    item(): void {
        this.separator();
    }

    /**
     * Append raw JSON text (a value).
     * @param text - the text
     */
    raw(text: string): void {
        this.parts.push(text);
    }

    /**
     * Write a member with a value in one call.
     * @param name - the key
     * @param text - the value's JSON text
     */
    member(name: string, text: string): void {
        this.key(name);
        this.parts.push(text);
    }

    /**
     * Hand out the text accumulated since the last take.
     * @returns the text
     */
    take(): string {
        const text = this.parts.length === 1 ? this.parts[0] : this.parts.join("");
        this.parts = [];
        return text;
    }

    /** The comma and newline before a member or element. */
    private separator(): void {
        const top = this.firstAtDepth.length - 1;
        if (this.firstAtDepth[top]) {
            this.firstAtDepth[top] = false;
        } else {
            this.parts.push(",");
        }
        this.parts.push(this.newline());
    }

    /**
     * A newline plus the current indentation, or nothing in compact mode.
     * @returns the text
     */
    private newline(): string {
        return this.indent !== "" ? `\n${this.indent.repeat(this.depth)}` : "";
    }
}

// ============================================================ planning

/** What plan() and its helpers share. */
interface PlanContext {
    readonly snapshot: GraphSnapshot;
    readonly resolved: Resolved;
    readonly dialect: JsonDialect;
    readonly caps: ExportCapabilities;
    readonly notes: LossNote[];
    readonly note: NoteFn;
    /** The reserved output keys per table. */
    readonly reserved: Readonly<Record<Domain, ReadonlySet<string>>>;
    readonly nonfinite: Counter;
}

/**
 * Build the column plan and the notes for one dialect.
 * @param snapshot - the snapshot
 * @param resolved - the resolved options
 * @returns the plan
 */
function plan(snapshot: GraphSnapshot, resolved: Resolved): Plan {
    const { dialect } = resolved;
    const caps = dialectCapabilities(dialect);
    // the generic position and edge-id notes are replaced by planTable()'s (both are written as
    // plain attributes and read back without their role)
    const notes = checkCapabilities(snapshot, caps, resolved.common, {
        roles: SLOT_ROLES[dialect],
        positionDtype: "f64",
        // Deprecated (next major): role columns are written as plain attributes; styles go through the style writer.
        vizAsAttributes: true,
    }).filter((n) => n.code !== LOSS.POSITIONS && n.code !== LOSS.EDGE_IDS_DROPPED);
    const note: NoteFn = (code, message, column = null, count = null): void => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    const ctx: PlanContext = {
        snapshot,
        resolved,
        dialect,
        caps,
        notes,
        note,
        reserved: reservedKeys(snapshot, resolved),
        nonfinite: { count: 0 },
    };
    const nodes = planTable(ctx, snapshot.nodes, "node");
    const edges = planTable(ctx, snapshot.edges, "edge");
    const graph = caps.graphAttributes ? planTable(ctx, snapshot.graph, "graph") : [];
    withdrawSlotNotes(notes, [...nodes, ...edges]);
    const weights = planWeights(ctx, edges);
    if (ctx.nonfinite.count > 0) {
        note(
            JSON_LOSS.NONFINITE_AS_NULL,
            `${ctx.nonfinite.count} non-finite number${plural(ctx.nonfinite.count)} ${agree(ctx.nonfinite.count, "is", "are")} written as null`,
            null,
            ctx.nonfinite.count,
        );
    }
    const { folding, directed } = planDirection(ctx);
    const multigraph = snapshot.flags.multigraph || snapshot.meta.declaredMultigraph === true;
    if (dialect === "jgf") {
        jgfIdNotes(snapshot, note);
    }
    const edgeIds = snapshot.edges.byRole("id");
    if (dialect === "cytoscape" && edgeIds !== null && edgeIds.nullCount > 0) {
        note(
            LOSS.EDGE_IDS_GENERATED,
            `${edgeIds.nullCount} edge${plural(edgeIds.nullCount)} ${agree(edgeIds.nullCount, "has", "have")} no id; canonical e<index> ids are generated for them`,
            edgeIds.meta.name,
            edgeIds.nullCount,
        );
    }
    return { resolved, notes, nodes, edges, graph, edgeIds, weights, folding, directed, multigraph };
}

/**
 * Withdraw the generic list note of a Cytoscape classes column: the slot writes the list as the
 * `classes` string and the importer reads it back as the list it was.
 * @param notes - the notes so far
 * @param plans - the node and edge plans
 */
function withdrawSlotNotes(notes: LossNote[], plans: readonly ColumnPlan[]): void {
    for (const plan of plans) {
        if (plan.slot !== "classes") {
            continue;
        }
        const at = notes.findIndex((n) => n.code === LOSS.LIST && n.column === plan.column.meta.name);
        if (at >= 0) {
            notes.splice(at, 1);
        }
    }
}

/**
 * The output keys each dialect reserves for its structure (a column of that name cannot be
 * written as an attribute): the id and endpoint keys, and the weight key of a weighted snapshot.
 * @param snapshot - the snapshot
 * @param resolved - the resolved options
 * @returns the reserved keys per table
 */
function reservedKeys(snapshot: GraphSnapshot, resolved: Resolved): Readonly<Record<Domain, ReadonlySet<string>>> {
    const { dialect } = resolved;
    const node = new Set<string>();
    const edge = new Set<string>(snapshot.flags.weighted ? [resolved.weightKey] : []);
    const graph = new Set<string>();
    switch (dialect) {
        case "node-link":
        case "d3":
            if (resolved.nodeIdKey !== null) {
                node.add(resolved.nodeIdKey);
            }
            edge.add(resolved.sourceKey).add(resolved.targetKey);
            break;
        case "vis":
            node.add(resolved.nodeIdKey ?? "id");
            // an edge key named source or target reads the document as node-link JSON, whose endpoints those are
            edge.add(resolved.sourceKey).add(resolved.targetKey).add("source").add("target");
            break;
        case "cytoscape":
            node.add("id").add("parent");
            edge.add("id").add("source").add("target");
            break;
        case "jgf":
        case "graphology":
            break;
        default: {
            const name: string = dialect;
            throw new GraphFormatError("E_UNSUPPORTED", `unknown dialect ${name}`, { option: "dialect", found: name });
        }
    }
    return { node, edge, graph };
}

/**
 * Classify the columns of one table: the slot each is written into and what it loses on the way
 * (JSON declares no types, so the notes name what the importer's inference reads back).
 * @param ctx - the plan context
 * @param table - the table
 * @param domain - its domain
 * @returns the plans of the written columns, in declaration order
 */
function planTable(ctx: PlanContext, table: Iterable<Column>, domain: Domain): ColumnPlan[] {
    const plans: ColumnPlan[] = [];
    const used = new Set<string>();
    for (const column of table) {
        const { role } = column.meta;
        if (role !== null && (STRUCTURAL_ROLES.has(role) || TEMPORAL_ROLES.has(role))) {
            continue;
        }
        if (domain !== "graph") {
            ctx.nonfinite.count += countNonFinite(column);
        }
        const slotted = planSlot(ctx, column, domain);
        if (slotted === null) {
            const plan = planAttribute(ctx, column, domain, used);
            if (plan !== null) {
                plans.push(plan);
            }
        } else if (slotted !== SKIPPED) {
            plans.push(slotted);
        }
    }
    return plans;
}

/**
 * The key and slot of a plain attribute column: in a nested dialect a node or edge column named
 * with the element suffix (or one of Cytoscape's element keys) is written on the element, one
 * named with the data suffix in its data.
 * @param dialect - the dialect
 * @param domain - the column's domain
 * @param name - the column name
 * @returns the key and the slot
 */
function attributeKey(dialect: JsonDialect, domain: Domain, name: string): { key: string; slot: Slot } {
    if (!NESTED_DIALECTS.has(dialect) || domain === "graph") {
        return { key: name, slot: "attribute" };
    }
    if (name.endsWith(SUFFIX.element)) {
        return { key: name.slice(0, -SUFFIX.element.length), slot: "element" };
    }
    if (dialect === "cytoscape" && CYTOSCAPE_ELEMENT_KEYS.has(name)) {
        return { key: name, slot: "element" };
    }
    if (name.endsWith(SUFFIX.data)) {
        return { key: name.slice(0, -SUFFIX.data.length), slot: "attribute" };
    }
    return { key: name, slot: "attribute" };
}

/**
 * Plan a column written as a plain attribute, unless its key is reserved by the dialect or
 * already used by another column of the table.
 * @param ctx - the plan context
 * @param column - the column
 * @param domain - its domain
 * @param used - the slot keys used so far in the table (receives this column's)
 * @returns the plan, or null for a column that cannot be written
 */
function planAttribute(ctx: PlanContext, column: Column, domain: Domain, used: Set<string>): ColumnPlan | null {
    const { dialect, note } = ctx;
    const { meta } = column;
    const setRows = column.length - column.nullCount;
    const { key, slot } = attributeKey(dialect, domain, meta.name);
    if (slot === "attribute" && ctx.reserved[domain].has(key)) {
        note(
            JSON_LOSS.RESERVED_KEY,
            `${domain} column "${meta.name}" cannot be written: "${key}" is a reserved key of ${dialect}`,
            meta.name,
            setRows,
        );
        return null;
    }
    const slotKey = `${slot}:${key}`;
    if (used.has(slotKey)) {
        note(
            JSON_LOSS.RESERVED_KEY,
            `${domain} column "${meta.name}" cannot be written: key "${key}" is already used by another column`,
            meta.name,
            setRows,
        );
        return null;
    }
    used.add(slotKey);
    if (setRows === 0 && domain !== "graph") {
        note(
            LOSS.EMPTY_COLUMN,
            `${domain} column "${meta.name}" has no set cell and is not written: JSON writes values, never declarations`,
            meta.name,
            0,
        );
    }
    inferenceNotes(ctx, column, domain, setRows);
    return { column, key, slot };
}

/** planSlot()'s answer for a role column handled (or dropped) without a plan of its own. */
const SKIPPED = Symbol("skipped");

/**
 * The structural slot of a role column in the dialect, when it has one: Cytoscape's parent,
 * position and classes, JGF's label and relation; the id-role edge column is written
 * structurally (data.id / key / id) where the dialect has an edge id and as a plain attribute
 * elsewhere; a position column without a slot is a plain array attribute.
 * @param ctx - the plan context
 * @param column - the column
 * @param domain - its domain
 * @returns the plan, SKIPPED for a column written structurally or dropped, null for a plain attribute
 */
function planSlot(ctx: PlanContext, column: Column, domain: Domain): ColumnPlan | typeof SKIPPED | null {
    const { role } = column.meta;
    if (role === "parent" || role === "parents") {
        return planParentSlot(ctx, column, domain, role);
    }
    if (role === "position" && domain === "node") {
        return planPositionSlot(ctx, column);
    }
    if (role === "id" && domain === "edge") {
        return planEdgeIdSlot(ctx, column);
    }
    return planDialectSlot(ctx.dialect, column, domain);
}

/**
 * The slot of a parent or parents column: Cytoscape's parent for a node parent column that
 * refers to nodes; every other one is dropped (noted for a Cytoscape node column).
 * @param ctx - the plan context
 * @param column - the parent or parents column
 * @param domain - its domain
 * @param role - its role
 * @returns the plan, or SKIPPED
 */
function planParentSlot(ctx: PlanContext, column: Column, domain: Domain, role: string): ColumnPlan | typeof SKIPPED {
    const { meta } = column;
    if (ctx.dialect !== "cytoscape" || domain !== "node") {
        return SKIPPED;
    }
    if (role === "parent" && column.dtype === "u32" && meta.refersTo === "node") {
        return { column, key: "parent", slot: "parent" };
    }
    ctx.note(
        LOSS.PARENTS,
        `node column "${meta.name}" (${role}) cannot be written: Cytoscape has a single parent`,
        meta.name,
        column.length - column.nullCount,
    );
    return SKIPPED;
}

/**
 * The slot of a node position column: Cytoscape's position for a float column of two or more
 * components (a non-zero z is noted), else a plain array attribute with the role lost.
 * @param ctx - the plan context
 * @param column - the node position column
 * @returns the plan
 */
function planPositionSlot(ctx: PlanContext, column: Column): ColumnPlan {
    const { dialect, note } = ctx;
    const { meta } = column;
    if (dialect === "cytoscape" && (column.dtype === "f32" || column.dtype === "f64") && meta.components >= 2) {
        const z = countNonZeroZ(column);
        if (z > 0) {
            note(
                JSON_LOSS.POSITION_Z_DROPPED,
                `${z} position${plural(z)} ${agree(z, "has", "have")} a non-zero z; Cytoscape positions are 2D`,
                meta.name,
                z,
            );
        }
        return { column, key: "position", slot: "cytoscapePosition" };
    }
    note(
        LOSS.POSITIONS,
        `node column "${meta.name}" (position) is written as a plain array attribute; its role is lost on re-import`,
        meta.name,
        column.length - column.nullCount,
    );
    return { column, key: meta.name, slot: "position" };
}

/**
 * The slot of the id-role edge column: written structurally where the dialect has an edge id,
 * else a plain attribute (noted).
 * @param ctx - the plan context
 * @param column - the edge id column
 * @returns null for a plain attribute, else SKIPPED
 */
function planEdgeIdSlot(ctx: PlanContext, column: Column): typeof SKIPPED | null {
    const { dialect } = ctx;
    if (dialect !== "node-link" && dialect !== "d3") {
        return SKIPPED;
    }
    ctx.note(
        LOSS.EDGE_IDS_DROPPED,
        `edge column "${column.meta.name}" (id) is written as a plain attribute; ${dialect} has no edge id`,
        column.meta.name,
        column.length - column.nullCount,
    );
    return null;
}

/**
 * The dialect slot of a classes, label or kind column: Cytoscape's classes, JGF's label and
 * relation.
 * @param dialect - the dialect
 * @param column - the column
 * @param domain - its domain
 * @returns the plan, or null for a plain attribute
 */
function planDialectSlot(dialect: JsonDialect, column: Column, domain: Domain): ColumnPlan | null {
    const { role } = column.meta;
    if (dialect === "cytoscape" && role === "classes" && column.dtype === "list" && column.child.dtype === "string") {
        return { column, key: "classes", slot: "classes" };
    }
    if (dialect !== "jgf" || (column.dtype !== "string" && column.dtype !== "dict")) {
        return null;
    }
    if (role === "label") {
        return { column, key: "label", slot: "label" };
    }
    if (role === "kind" && domain === "edge") {
        return { column, key: "relation", slot: "relation" };
    }
    return null;
}

/**
 * What the importer's inference (design section 5.1: JSON numbers are i32 when integral, else
 * f64; strings are strings; arrays and objects are json) changes about a written attribute
 * column beyond what checkCapabilities() already reported for its dtype: an f64 column whose set
 * finite values are all integers reads back as i32 (its non-finite values are written as null).
 * @param ctx - the plan context
 * @param column - the column
 * @param domain - its domain
 * @param setRows - the set rows
 */
function inferenceNotes(ctx: PlanContext, column: Column, domain: Domain, setRows: number): void {
    if (column.dtype !== "f64" || column.meta.components > 1 || setRows === 0) {
        return;
    }
    const { data } = column;
    let finite = 0;
    for (let r = 0; r < column.length; r++) {
        // a non-finite value is written as null and reads back unset, so it does not keep the column f64
        if (column.isSet(r) && Number.isFinite(data[r])) {
            if (!Number.isInteger(data[r])) {
                return;
            }
            finite++;
        }
    }
    if (finite === 0) {
        return;
    }
    ctx.note(
        LOSS.INTEGRAL_F64,
        `${domain} column "${column.meta.name}" is f64 with integral values only; JSON declares no types and it reads back as i32`,
        column.meta.name,
        setRows,
    );
}

/**
 * The explicit weights and their JSON text (non-finite values become null and are counted).
 * @param ctx - the plan context
 * @param edges - the edge column plans (for the weight-key clash note)
 * @returns the weight text function
 */
function planWeights(ctx: PlanContext, edges: readonly ColumnPlan[]): (e: number) => string | null {
    const { snapshot, nonfinite } = ctx;
    const weights = explicitWeights(snapshot);
    if (!weights.weighted) {
        const clash = edges.find((p) => p.slot === "attribute" && p.key === ctx.resolved.weightKey);
        if (clash !== undefined) {
            ctx.note(
                LOSS.WEIGHT_KEY_CLASH,
                `edge column "${clash.column.meta.name}" is written under "${clash.key}", the key the importer reads edge weights from; it reads back as the weight, not as a column`,
                clash.column.meta.name,
                clash.column.length - clash.column.nullCount,
            );
        }
        return (): null => null;
    }
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (weights.isExplicit(e) && !Number.isFinite(weights.value(e))) {
            nonfinite.count++;
        }
    }
    return (e: number): string | null => {
        if (!weights.isExplicit(e)) {
            return null;
        }
        const text = Number.isFinite(weights.value(e)) ? weights.text(e) : "null";
        return text === null ? null : exponentIfUnsafe(text);
    };
}

/**
 * The direction decisions: the pair folding (mutual pairs are written as two directed edges and
 * reported), the file-level direction under the onMixedDirection policy of a dialect without a
 * per-edge flag, and the note of the dialects that carry no direction at all.
 * @param ctx - the plan context
 * @returns the folding and the file-level direction
 */
function planDirection(ctx: PlanContext): { readonly folding: PairFolding; readonly directed: boolean } {
    const { snapshot, dialect, caps, note } = ctx;
    const folding = pairFolding(snapshot);
    if (folding.mutualCount > 0) {
        note(
            LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair${plural(folding.mutualCount)} ${agree(folding.mutualCount, "is", "are")} written as two directed edges; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }
    let { directed } = snapshot;
    if (
        !caps.mixedDirection &&
        countMixedEdges(snapshot) > 0 &&
        ctx.resolved.common.onMixedDirection === "undirected"
    ) {
        directed = false;
    }
    if (dialect === "cytoscape" || dialect === "vis" || dialect === "d3") {
        const assumed = DIALECT_DEFAULT_DIRECTED[dialect];
        if (directed !== assumed) {
            note(
                JSON_LOSS.DIRECTION_DROPPED,
                `${dialect} has no direction flag; the ${directed ? "directed" : "undirected"} graph re-imports as ${assumed ? "directed" : "undirected"} unless defaultDirected is passed`,
            );
        }
    }
    return { folding, directed };
}

/**
 * How many rows of a position column have a non-zero third component.
 * @param column - an f32 / f64 column with at least two components
 * @returns the count
 */
function countNonZeroZ(column: Column): number {
    if ((column.dtype !== "f32" && column.dtype !== "f64") || column.meta.components < 3) {
        return 0;
    }
    const { components } = column.meta;
    let count = 0;
    for (let r = 0; r < column.length; r++) {
        if (column.isSet(r) && column.data[r * components + 2] !== 0) {
            count++;
        }
    }
    return count;
}

/**
 * The JGF id notes: numeric ids become string keys, colliding texts are refused, and integer-like
 * keys are enumerated first and ascending by every JSON parser so the node order may change.
 * @param snapshot - the snapshot
 * @param note - the recorder
 */
function jgfIdNotes(
    snapshot: GraphSnapshot,
    note: (code: string, message: string, column?: string | null, count?: number | null) => void,
): void {
    const { ids } = snapshot;
    const seen = new Set<string>();
    let numeric = 0;
    let collisions = 0;
    let indexLike = 0;
    let lastIndex = -1;
    let ordered = true;
    let sawOther = false;
    for (let i = 0; i < ids.size; i++) {
        const id = ids.idOf(i);
        const text = String(id);
        if (typeof id === "number") {
            numeric++;
        }
        if (seen.has(text)) {
            collisions++;
        }
        seen.add(text);
        if (isArrayIndexKey(text)) {
            indexLike++;
            const n = Number(text);
            if (sawOther || n <= lastIndex) {
                ordered = false;
            }
            lastIndex = n;
        } else {
            sawOther = true;
        }
    }
    if (numeric > 0) {
        note(
            JSON_LOSS.NUMERIC_IDS_STRINGIFIED,
            `${numeric} numeric node id${plural(numeric)} ${agree(numeric, "becomes", "become")} JGF object keys (strings); pass ids: "canonical" on re-import`,
            null,
            numeric,
        );
    }
    if (collisions > 0) {
        note(
            JSON_LOSS.ID_TEXT_COLLISION,
            `${collisions} node id${plural(collisions)} ${agree(collisions, "shares", "share")} their text with another id; the save fails`,
            null,
            collisions,
        );
    }
    if (!ordered) {
        note(
            JSON_LOSS.NODE_ORDER,
            `${indexLike} integer-like node id${plural(indexLike)} ${agree(indexLike, "is", "are")} enumerated first and ascending by JSON parsers; node order changes on re-import`,
            null,
            indexLike,
        );
    }
}

/**
 * Whether a key is an array index in the JS sense (enumerated before other keys, ascending).
 * @param text - the key
 * @returns true for canonical integer text below 2^32 - 1
 */
function isArrayIndexKey(text: string): boolean {
    return /^(0|[1-9]\d*)$/.test(text) && Number(text) < 4294967295;
}

// ============================================================ writing

/**
 * The text parts of the document.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields one part per header, node, edge and footer
 * @returns nothing
 */
function* write(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { dialect } = p.resolved;
    if (p.notes.some((n) => n.code === LOSS.MIXED_DIRECTION_ERROR)) {
        throw new GraphFormatError(
            "E_DIRECTED",
            `${dialect} has no mixed direction; pass onMixedDirection "directed" or "undirected"`,
            { reason: "mixed direction", dialect },
        );
    }
    if (p.notes.some((n) => n.code === JSON_LOSS.ID_TEXT_COLLISION)) {
        throw new GraphFormatError("E_INVALID_ID", "two node ids have the same text; JGF keys nodes by text", {
            reason: "collision",
        });
    }
    switch (dialect) {
        case "node-link":
        case "d3":
            yield* writeNodeLink(snapshot, p);
            return;
        case "vis":
            yield* writeVis(snapshot, p);
            return;
        case "graphology":
            yield* writeGraphology(snapshot, p);
            return;
        case "jgf":
            yield* writeJgf(snapshot, p);
            return;
        case "cytoscape":
            yield* writeCytoscape(snapshot, p);
            return;
        default: {
            const name: string = dialect;
            throw new GraphFormatError("E_UNSUPPORTED", `unknown dialect ${name}`, { option: "dialect", found: name });
        }
    }
}

/** The shared per-row state of the writers. */
interface Cursor {
    readonly w: JsonWriter;
    readonly ids: GraphSnapshot["ids"];
    readonly nonfinite: Counter;
}

/**
 * Write the members of one row's planned columns into the current object, attributes only.
 * @param c - the cursor
 * @param plans - the table plan
 * @param row - the row
 * @param slots - which slots to write
 */
function writeSlots(c: Cursor, plans: readonly ColumnPlan[], row: number, slots: ReadonlySet<Slot>): void {
    for (const item of plans) {
        if (!slots.has(item.slot) || !item.column.isSet(row)) {
            continue;
        }
        let text: string;
        switch (item.slot) {
            case "position": {
                const value = item.column.value(row);
                const dims = dimsOf(item.column);
                const values = Array.from(value as ArrayLike<number>).slice(0, dims);
                text = valueText(values, item.column.dtype === "f32", c.nonfinite);
                break;
            }
            case "classes":
                text = JSON.stringify((item.column as Extract<Column, { dtype: "list" }>).sliceOf(row).join(" "));
                break;
            default:
                text = cellText(item.column, row, c.ids, c.nonfinite);
                break;
        }
        c.w.member(item.key, text);
    }
}

const ATTRIBUTE_SLOTS: ReadonlySet<Slot> = new Set(["attribute", "position"]);
const ELEMENT_SLOTS: ReadonlySet<Slot> = new Set(["element", "classes"]);

/**
 * The number of components a position column writes: `extra.sourceDims` when recorded, else all.
 * @param column - the position column
 * @returns 2 or 3 (or the component count)
 */
function dimsOf(column: Column): number {
    const dims: unknown = column.meta.extra.sourceDims;
    if (typeof dims === "number" && dims >= 1 && dims <= column.meta.components) {
        return dims;
    }
    return column.meta.components;
}

/**
 * Whether any planned column of a slot set has a value in a row (to omit an empty nested dict).
 * @param plans - the table plan
 * @param row - the row
 * @param slots - the slots
 * @returns true when something would be written
 */
function anySet(plans: readonly ColumnPlan[], row: number, slots: ReadonlySet<Slot>): boolean {
    return plans.some((item) => slots.has(item.slot) && item.column.isSet(row));
}

/**
 * The JSON text of a node id.
 * @param id - the id
 * @returns the text
 */
function idText(id: NodeId): string {
    if (typeof id === "number") {
        return Object.is(id, -0) ? "0" : exponentIfUnsafe(String(id));
    }
    return JSON.stringify(id);
}

/**
 * The edge id text of an edge, or null when none is set.
 * @param p - the plan
 * @param e - the edge
 * @param c - the cursor
 * @returns the text, or null
 */
function edgeIdText(p: Plan, e: number, c: Cursor): string | null {
    const column = p.edgeIds;
    if (!column?.isSet(e)) {
        return null;
    }
    return cellText(column, e, c.ids, c.nonfinite);
}

/**
 * Whether an edge is written, and as which kind, under the plan's direction policy.
 * @param p - the plan
 * @param e - the edge
 * @returns "skip" for a folded mirror, "undirected" for a pair primary, "directed" otherwise
 */
function edgeDisposition(p: Plan, e: number): "skip" | "undirected" | "directed" {
    const { folding } = p;
    if (folding.folded(e)) {
        return "skip";
    }
    if (!p.directed) {
        return "undirected";
    }
    if (folding.sourceDirected(e)) {
        return "directed";
    }
    // a source-undirected edge (pair primary or expanded self-loop): a dialect with a per-edge flag
    // keeps it; one without writes it per the policy (the pair folds to one directed edge)
    if (dialectCapabilities(p.resolved.dialect).mixedDirection) {
        return "undirected";
    }
    return p.resolved.common.onMixedDirection === "directed" ? "directed" : "undirected";
}

/**
 * The graph-level attribute object.
 * @param c - the cursor
 * @param p - the plan
 */
function writeGraphObject(c: Cursor, p: Plan): void {
    c.w.open("{");
    for (const item of p.graph) {
        if (item.column.isSet(0)) {
            c.w.member(item.key, cellText(item.column, 0, c.ids, c.nonfinite));
        }
    }
    c.w.close("}");
}

/**
 * The endpoint texts of an edge: ids, or array positions under index links.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param e - the edge
 * @returns the source and target texts
 */
function endpoints(snapshot: GraphSnapshot, p: Plan, e: number): [string, string] {
    const list = snapshot.edgeList();
    const u = list.src[e];
    const v = list.dst[e];
    if (p.resolved.indexLinks) {
        return [String(u), String(v)];
    }
    return [idText(snapshot.ids.idOf(u)), idText(snapshot.ids.idOf(v))];
}

/**
 * Write a node-link / d3 document.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the parts
 * @returns nothing
 */
function* writeNodeLink(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { resolved } = p;
    const c: Cursor = { w: new JsonWriter(resolved.indent), ids: snapshot.ids, nonfinite: { count: 0 } };
    const { w } = c;
    w.open("{");
    if (resolved.dialect !== "d3") {
        // d3 is the bare shape: no direction, multigraph or graph keys (the importer sniffs it by their absence)
        w.member("directed", p.directed ? "true" : "false");
        w.member("multigraph", p.multigraph ? "true" : "false");
        w.key("graph");
        writeGraphObject(c, p);
    }
    w.key("nodes");
    w.open("[");
    yield w.take();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        w.item();
        w.open("{");
        if (resolved.nodeIdKey !== null) {
            w.member(resolved.nodeIdKey, idText(snapshot.ids.idOf(i)));
        }
        writeSlots(c, p.nodes, i, ATTRIBUTE_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    w.key(resolved.edgesKey);
    w.open("[");
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const disposition = edgeDisposition(p, e);
        if (disposition === "skip") {
            continue;
        }
        const [s, t] = endpoints(snapshot, p, e);
        w.item();
        w.open("{");
        w.member(resolved.sourceKey, s);
        w.member(resolved.targetKey, t);
        const weight = p.weights(e);
        if (weight !== null) {
            w.member(resolved.weightKey, weight);
        }
        writeSlots(c, p.edges, e, ATTRIBUTE_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    writeTopLevelBlock(c, p);
    w.close("}");
    yield w.take();
}

/**
 * The `graphty.styles` block as a top-level key, for a dialect that holds it there.
 * @param c - the cursor
 * @param p - the plan
 */
function writeTopLevelBlock(c: Cursor, p: Plan): void {
    const groups = p.resolved.styled?.groups ?? null;
    if (groups !== null) {
        c.w.member("groups", JSON.stringify(groups));
    }
    const block = p.resolved.styled?.topLevelBlock ?? null;
    if (block !== null) {
        c.w.member(STYLE_BLOCK_NAME, JSON.stringify(block));
    }
}

/**
 * Write a vis.js document.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the parts
 * @returns nothing
 */
function* writeVis(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { resolved } = p;
    const c: Cursor = { w: new JsonWriter(resolved.indent), ids: snapshot.ids, nonfinite: { count: 0 } };
    const { w } = c;
    const nodeIdKey = resolved.nodeIdKey ?? "id";
    w.open("{");
    w.key("nodes");
    w.open("[");
    yield w.take();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        w.item();
        w.open("{");
        w.member(nodeIdKey, idText(snapshot.ids.idOf(i)));
        writeSlots(c, p.nodes, i, ATTRIBUTE_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    w.key("edges");
    w.open("[");
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (edgeDisposition(p, e) === "skip") {
            continue;
        }
        const list = snapshot.edgeList();
        w.item();
        w.open("{");
        const id = edgeIdText(p, e, c);
        if (id !== null) {
            w.member("id", id);
        }
        w.member(resolved.sourceKey, idText(snapshot.ids.idOf(list.src[e])));
        w.member(resolved.targetKey, idText(snapshot.ids.idOf(list.dst[e])));
        const weight = p.weights(e);
        if (weight !== null) {
            w.member(resolved.weightKey, weight);
        }
        writeSlots(c, p.edges, e, ATTRIBUTE_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    writeTopLevelBlock(c, p);
    w.close("}");
    yield w.take();
}

/**
 * Write a row's attribute columns as a nested object (graphology's `attributes`, JGF's
 * `metadata`), with the edge weight first; nothing when the row has neither.
 * @param c - the cursor
 * @param plans - the column plans of the table
 * @param row - the row
 * @param key - the key of the nested object
 * @param weight - the weight text of an edge, or null
 * @param weightKey - the key of the weight
 */
function writeAttributeObject(
    c: Cursor,
    plans: readonly ColumnPlan[],
    row: number,
    key: string,
    weight: string | null,
    weightKey: string,
): void {
    if (weight === null && !anySet(plans, row, ATTRIBUTE_SLOTS)) {
        return;
    }
    const { w } = c;
    w.key(key);
    w.open("{");
    if (weight !== null) {
        w.member(weightKey, weight);
    }
    writeSlots(c, plans, row, ATTRIBUTE_SLOTS);
    w.close("}");
}

/**
 * The graphology graph type: undirected, mixed (a directed graph holding undirected edges) or directed.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @returns the type
 */
function graphologyType(snapshot: GraphSnapshot, p: Plan): string {
    if (!p.directed) {
        return "undirected";
    }
    return countMixedEdges(snapshot) > 0 ? "mixed" : "directed";
}

/**
 * Write the graphology `options` object.
 * @param c - the cursor
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param type - the graph type
 */
function writeGraphologyOptions(c: Cursor, snapshot: GraphSnapshot, p: Plan, type: string): void {
    const { w } = c;
    const { resolved } = p;
    w.key("options");
    w.open("{");
    w.member("type", JSON.stringify(type));
    // the shape the importer read is written back as read: `multi` and `allowSelfLoops` only when
    // the source declared them (or the graph needs them)
    if (snapshot.meta.declaredMultigraph !== null || p.multigraph) {
        w.member("multi", p.multigraph ? "true" : "false");
    }
    if (resolved.shape.allowSelfLoops !== undefined) {
        w.member("allowSelfLoops", !resolved.shape.allowSelfLoops && snapshot.selfLoopCount === 0 ? "false" : "true");
    }
    w.close("}");
}

/**
 * Write one graphology edge.
 * @param c - the cursor
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param e - the edge
 * @param undirected - whether the edge is marked undirected (an undirected edge of a mixed graph)
 */
function writeGraphologyEdge(c: Cursor, snapshot: GraphSnapshot, p: Plan, e: number, undirected: boolean): void {
    const { w } = c;
    const list = snapshot.edgeList();
    w.item();
    w.open("{");
    const id = edgeIdText(p, e, c);
    if (id !== null) {
        w.member("key", id);
    }
    w.member("source", idText(snapshot.ids.idOf(list.src[e])));
    w.member("target", idText(snapshot.ids.idOf(list.dst[e])));
    if (undirected) {
        w.member("undirected", "true");
    }
    writeAttributeObject(c, p.edges, e, "attributes", p.weights(e), p.resolved.weightKey);
    writeSlots(c, p.edges, e, ELEMENT_SLOTS);
    w.close("}");
}

/**
 * Write a graphology serialization.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the parts
 * @returns nothing
 */
function* writeGraphology(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { resolved } = p;
    const c: Cursor = { w: new JsonWriter(resolved.indent), ids: snapshot.ids, nonfinite: { count: 0 } };
    const { w } = c;
    const type = graphologyType(snapshot, p);
    w.open("{");
    w.key("attributes");
    writeGraphObject(c, p);
    writeGraphologyOptions(c, snapshot, p, type);
    w.key("nodes");
    w.open("[");
    yield w.take();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        w.item();
        w.open("{");
        w.member("key", idText(snapshot.ids.idOf(i)));
        writeAttributeObject(c, p.nodes, i, "attributes", null, resolved.weightKey);
        writeSlots(c, p.nodes, i, ELEMENT_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    w.key("edges");
    w.open("[");
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const disposition = edgeDisposition(p, e);
        if (disposition === "skip") {
            continue;
        }
        writeGraphologyEdge(c, snapshot, p, e, type === "mixed" && disposition === "undirected");
        yield w.take();
    }
    w.close("]");
    w.close("}");
    yield w.take();
}

/** The JGF label slot. */
const JGF_LABEL_SLOTS: ReadonlySet<Slot> = new Set(["label"]);

/** The JGF relation slot. */
const JGF_RELATION_SLOTS: ReadonlySet<Slot> = new Set(["relation"]);

/**
 * Write the members of the JGF `graph` object that precede its nodes.
 * @param c - the cursor
 * @param snapshot - the snapshot
 * @param p - the plan
 */
function writeJgfGraphHeader(c: Cursor, snapshot: GraphSnapshot, p: Plan): void {
    const { w } = c;
    const { shape } = p.resolved;
    if (shape.id !== undefined) {
        w.member("id", JSON.stringify(shape.id));
    }
    if (snapshot.meta.name !== null) {
        w.member("label", JSON.stringify(snapshot.meta.name));
    }
    if (shape.type !== undefined) {
        w.member("type", JSON.stringify(shape.type));
    }
    w.member("directed", p.directed ? "true" : "false");
    if (p.graph.some((item) => item.column.isSet(0))) {
        w.key("metadata");
        writeGraphObject(c, p);
    }
}

/**
 * Write one JGF edge.
 * @param c - the cursor
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param e - the edge
 * @param undirected - whether the edge is undirected in a directed graph
 */
function writeJgfEdge(c: Cursor, snapshot: GraphSnapshot, p: Plan, e: number, undirected: boolean): void {
    const { w } = c;
    const list = snapshot.edgeList();
    w.item();
    w.open("{");
    const id = edgeIdText(p, e, c);
    if (id !== null) {
        w.member("id", id);
    }
    w.member("source", JSON.stringify(String(snapshot.ids.idOf(list.src[e]))));
    w.member("target", JSON.stringify(String(snapshot.ids.idOf(list.dst[e]))));
    writeSlots(c, p.edges, e, JGF_RELATION_SLOTS);
    if (undirected) {
        w.member("directed", "false");
    }
    writeSlots(c, p.edges, e, JGF_LABEL_SLOTS);
    writeAttributeObject(c, p.edges, e, "metadata", p.weights(e), p.resolved.weightKey);
    writeSlots(c, p.edges, e, ELEMENT_SLOTS);
    w.close("}");
}

/**
 * Write a JSON Graph Format v2 document.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the parts
 * @returns nothing
 */
function* writeJgf(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { resolved } = p;
    const c: Cursor = { w: new JsonWriter(resolved.indent), ids: snapshot.ids, nonfinite: { count: 0 } };
    const { w } = c;
    w.open("{");
    w.key("graph");
    w.open("{");
    writeJgfGraphHeader(c, snapshot, p);
    w.key("nodes");
    w.open("{");
    yield w.take();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        w.key(String(snapshot.ids.idOf(i)));
        w.open("{");
        writeSlots(c, p.nodes, i, JGF_LABEL_SLOTS);
        writeAttributeObject(c, p.nodes, i, "metadata", null, resolved.weightKey);
        writeSlots(c, p.nodes, i, ELEMENT_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("}");
    w.key("edges");
    w.open("[");
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const disposition = edgeDisposition(p, e);
        if (disposition === "skip") {
            continue;
        }
        writeJgfEdge(c, snapshot, p, e, p.directed && disposition === "undirected");
        yield w.take();
    }
    w.close("]");
    w.close("}");
    w.close("}");
    yield w.take();
}

/**
 * Write Cytoscape.js elements.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the parts
 * @returns nothing
 */
function* writeCytoscape(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const { resolved } = p;
    const c: Cursor = { w: new JsonWriter(resolved.indent), ids: snapshot.ids, nonfinite: { count: 0 } };
    const { w } = c;
    const parentSlots: ReadonlySet<Slot> = new Set(["parent"]);
    w.open("{");
    w.key("elements");
    w.open("{");
    w.key("nodes");
    w.open("[");
    yield w.take();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        w.item();
        w.open("{");
        w.key("data");
        w.open("{");
        w.member("id", idText(snapshot.ids.idOf(i)));
        writeSlots(c, p.nodes, i, parentSlots);
        writeSlots(c, p.nodes, i, ATTRIBUTE_SLOTS);
        w.close("}");
        writeCytoscapePosition(c, p, i);
        writeSlots(c, p.nodes, i, ELEMENT_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    w.key("edges");
    w.open("[");
    const generated = edgeIdGenerator(snapshot, p);
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (edgeDisposition(p, e) === "skip") {
            continue;
        }
        const list = snapshot.edgeList();
        w.item();
        w.open("{");
        w.key("data");
        w.open("{");
        w.member("id", edgeIdText(p, e, c) ?? generated(e));
        w.member("source", idText(snapshot.ids.idOf(list.src[e])));
        w.member("target", idText(snapshot.ids.idOf(list.dst[e])));
        const weight = p.weights(e);
        if (weight !== null) {
            w.member(resolved.weightKey, weight);
        }
        writeSlots(c, p.edges, e, ATTRIBUTE_SLOTS);
        w.close("}");
        writeSlots(c, p.edges, e, ELEMENT_SLOTS);
        w.close("}");
        yield w.take();
    }
    w.close("]");
    w.close("}");
    if (p.graph.some((item) => item.column.isSet(0))) {
        w.key("data");
        writeGraphObject(c, p);
    }
    writeCytoscapeTopLevel(c, p);
    writeTopLevelBlock(c, p);
    w.close("}");
    yield w.take();
}

/**
 * Write a Cytoscape.js node's position: stored y-up, written with Cytoscape's y growing downward.
 * @param c - the cursor
 * @param p - the plan
 * @param i - the node
 */
function writeCytoscapePosition(c: Cursor, p: Plan, i: number): void {
    const { w } = c;
    for (const item of p.nodes) {
        if (item.slot === "cytoscapePosition" && item.column.isSet(i)) {
            const value = item.column.value(i) as ArrayLike<number>;
            const f32 = item.column.dtype === "f32";
            w.key("position");
            w.open("{");
            w.member("x", numberText(value[0], f32, c.nonfinite));
            w.member("y", numberText(flipY(value[1]), f32, c.nonfinite));
            w.close("}");
        }
    }
}

/**
 * Write the top-level keys of a Cytoscape.js document an import kept, and the stylesheet: the styles written replace
 * the stylesheet the file was read with.
 * @param c - the cursor
 * @param p - the plan
 */
function writeCytoscapeTopLevel(c: Cursor, p: Plan): void {
    const { w } = c;
    const extra = p.resolved.shape.cytoscape ?? {};
    const stylesheet = p.resolved.styled?.stylesheet ?? null;
    for (const key of Object.keys(extra)) {
        if (key !== "elements" && key !== "data" && !(key === "style" && stylesheet !== null)) {
            w.member(key, valueText(extra[key], false, c.nonfinite));
        }
    }
    if (stylesheet !== null) {
        w.member("style", valueText(stylesheet, false, c.nonfinite));
    }
}

/**
 * A generator of canonical `e<index>` edge ids for the edges without one (design section 4.6),
 * skipping any text a node id or an explicit edge id already uses (Cytoscape ids share one
 * namespace).
 * @param snapshot - the snapshot
 * @param p - the plan
 * @returns the id text of an edge without an explicit id
 */
function edgeIdGenerator(snapshot: GraphSnapshot, p: Plan): (e: number) => string {
    const used = new Set<string>();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        used.add(String(snapshot.ids.idOf(i)));
    }
    const column = p.edgeIds;
    if (column !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            if (column.isSet(e)) {
                used.add(String(column.value(e)));
            }
        }
    }
    return (e: number): string => {
        let candidate = `e${e}`;
        let k = 2;
        while (used.has(candidate)) {
            candidate = `e${e}_${k}`;
            k++;
        }
        used.add(candidate);
        return JSON.stringify(candidate);
    };
}

// ============================================================ the plugin

/**
 * The text parts of the document in the resolved dialect.
 * @param snapshot - the snapshot
 * @param resolved - the resolved options
 * @returns the parts
 */
function parts(snapshot: GraphSnapshot, resolved: Resolved): Generator<string, void, undefined> {
    const s = resolved.styled?.snapshot ?? snapshot;
    return resolved.dialect === "obographs" ? planObographs(s, resolved).write() : write(s, plan(s, resolved));
}

/**
 * Resolve the options and, when styles are written, work them out for the dialect.
 * @param snapshot - the snapshot
 * @param options - the caller's options, with the styles graph-io hands an exporter
 * @returns the resolved options
 */
function resolveStyled(snapshot: GraphSnapshot, options: JsonWriteOptions | undefined): Resolved {
    const resolved = resolve(snapshot, options);
    const styled = jsonStyledExport(snapshot, resolved.dialect, options?.styles);
    return styled === null ? resolved : { ...resolved, styled };
}

/**
 * The JSON exporter plugin. `capabilities` is the node-link table (the
 * default dialect); check() applies the table of the dialect actually selected.
 * @category Built-in formats
 */
export const jsonExporter: GraphExporter<JsonExportOptions> = Object.freeze({
    format: "json",
    options: Object.freeze([
        "dialect",
        "edgesKey",
        "indent",
        "indexLinks",
        "nodeIdKey",
        "ontologyIri",
        "sourceKey",
        "targetKey",
        "weightKey",
    ]),
    capabilities: dialectCapabilities("node-link"),
    styles: Object.freeze({ capabilities: JSON_STYLE_CAPABILITIES }),

    /**
     * Pre-flight: every loss of the selected dialect, without writing anything.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: JsonExportOptions & CommonExportOptions): readonly LossNote[] {
        const resolved = resolveStyled(snapshot, options);
        const s = resolved.styled?.snapshot ?? snapshot;
        const notes = resolved.dialect === "obographs" ? planObographs(s, resolved).notes : plan(s, resolved).notes;
        return Object.freeze([...notes, ...(resolved.styled?.notes ?? [])]);
    },

    /**
     * Write the document as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the chunks
     */
    export(snapshot: GraphSnapshot, options?: JsonExportOptions & CommonExportOptions): AsyncIterable<Uint8Array> {
        return encodeChunks(parts(snapshot, resolveStyled(snapshot, options)));
    },

    /**
     * Write the document as one string.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the document
     */
    exportToString(snapshot: GraphSnapshot, options?: JsonExportOptions & CommonExportOptions): Promise<string> {
        return joinText(parts(snapshot, resolveStyled(snapshot, options)));
    },
});

/**
 * The capability table of one dialect, for callers that pick a dialect before check().
 * @param dialect - the dialect
 * @returns the frozen table
 * @category Built-in formats
 */
export function jsonCapabilities(dialect: JsonDialect): ExportCapabilities {
    return dialectCapabilities(dialect);
}
