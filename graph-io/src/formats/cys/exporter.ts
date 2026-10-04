/**
 * The Cytoscape session exporter: writes a snapshot as a `.cys` file that Cytoscape Desktop 3.x
 * opens as a session holding one network (one collection with one registered subnetwork).
 *
 * The archive holds what Cytoscape's session reader needs and nothing more:
 * - `CytoscapeSession/3.0.0.version`, the empty marker that makes Cytoscape read a 3.x session;
 * - `networks/<root>-<name>.xgmml`, the topology: one root network holding one registered
 *   subnetwork, its nodes and edges by SUID, each edge with `cy:directed`;
 * - `tables/<subnetwork>-<name>/LOCAL_ATTRS-org.cytoscape.model.Cy{Node,Edge,Network}-*.cytable`,
 *   every column as a CyCSV table keyed by SUID (a session network file carries no attributes:
 *   Cytoscape ignores atts on the nodes and edges of a 3.x session), with the label in `name`,
 *   which Cytoscape's default style shows; plus the root network's own table with its name;
 * - `views/<subnetwork>-<view>-<name>.xgmml`, the node coordinates (y negated back to screen
 *   coordinates), only when the snapshot has positions: graph-io computes no layout.
 *
 * Styles, the network list, properties and thumbnails are not written; Cytoscape gives the view
 * its default style. Entries are stored, not compressed. Every SUID comes from one counter, above
 * the node ids that are kept as SUIDs; Cytoscape renumbers them all on load.
 */

import { type Column, GraphFormatError, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import { DictHeuristic } from "../../common/attributes.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { escapeXmlAttribute, quoteCsvCell } from "../../common/escape.js";
import { capabilities, checkCapabilities, LOSS } from "../../common/export.js";
import { formatDecimal, formatF32, formatF64 } from "../../common/format.js";
import { type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { hasIllegalXmlChar } from "../../common/xml.js";
import { writeZip, type ZipWriteEntry } from "../../common/zip.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import { ORIGINAL_ID_ATTRIBUTE } from "../graphml/constants.js";
import {
    CY_NAMESPACE,
    EDGE_ID_COLUMN,
    GRAPHICS_COLUMN,
    NESTED_NETWORK_COLUMN,
    NETWORK_POINTER_COLUMN,
    NETWORKS_COLUMN,
    PARENT_COLUMN,
    PARENTS_COLUMN,
    POSITION_COLUMN,
    SUBGRAPH_COLUMN,
    XGMML_NAMESPACE,
    XLINK_NAMESPACE,
    Z_COLUMN,
} from "../xgmml/constants.js";
import { FORMAT } from "./constants.js";

/**
 * The options of the Cytoscape session exporter: the common export options; it has none of its own. The
 * collection and network names come from the snapshot's `meta.name` (default "Network").
 * @category Built-in formats
 */
export type CysExportOptions = CommonExportOptions;

/**
 * The loss notes the session exporter's check() returns, by name. A key is the code without its
 * severity and format prefixes.
 * @category Built-in formats
 */
export const CYS_LOSS = Object.freeze({
    /** CyCSV has no unset text cell: an unset cell of a text column reads back as "". */
    UNSET_AS_EMPTY_STRING: "W_CYS_UNSET_AS_EMPTY_STRING",
    /**
     * List cells CyCSV cannot hold exactly: an unset or empty list of text reads back as [""], an
     * empty list of numbers or booleans reads back unset, trailing empty text items vanish, and an
     * item holding a newline splits in two.
     */
    LIST_ITEMS: "W_CYS_LIST_ITEMS",
    /** A text cell starting with "=" is a formula to Cytoscape (an error cell there); graph-io reads it back as text. */
    TEXT_AS_EQUATION: "W_CYS_TEXT_AS_EQUATION",
    /** A nested (json) column is written as a text column holding its JSON text. */
    JSON_AS_STRING: "W_CYS_JSON_AS_STRING",
    /** A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column. */
    POSITION: "W_CYS_POSITION",
    /**
     * An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the
     * name the format's importer gives it.
     */
    COLUMN_NAME_CHANGED: LOSS.COLUMN_NAME_CHANGED,
    /**
     * An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and
     * reads back with that role.
     */
    ROLE_ASSUMED: LOSS.ROLE_ASSUMED,
    /** A mutual pair is written as two directed edges without its mark. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /** Node ids that are numbers read back as their text. */
    ID_TEXT_TYPE: LOSS.ID_TEXT_TYPE,
    /**
     * Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with
     * E_INVALID_ID.
     */
    ID_TEXT_COLLISION: LOSS.ID_TEXT_COLLISION,
    /**
     * Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with E_INVALID_ID. Pass
     * `sanitizeIds: "mangle"` to rewrite them.
     */
    ID_CHARSET: LOSS.ID_CHARSET,
    /** Node ids that are not positive integers under sanitizeIds "mangle": renumbered, originals kept. */
    ID_MANGLED: LOSS.ID_MANGLED,
    /** Edges without a usable id get generated SUIDs. */
    EDGE_IDS_GENERATED: LOSS.EDGE_IDS_GENERATED,
    /**
     * An attribute type Cytoscape stores as a wider one (a 32-bit float as Double, a byte as Integer), or a label that
     * is not text and is written as text; it reads back with the Cytoscape type.
     */
    DTYPE_UNSUPPORTED: LOSS.DTYPE,
    /** A column whose every cell is unset (and which is not text) vanishes. */
    EMPTY_COLUMN_DROPPED: LOSS.EMPTY_COLUMN,
    /**
     * A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often
     * its values repeat. The values are the same.
     */
    STORAGE_CLASS_CHANGED: LOSS.STORAGE_CLASS,
    /** A plain `weight` edge column reads back as the edge weight. */
    WEIGHT_KEY_CLASH: LOSS.WEIGHT_KEY_CLASH,
    /** A parent / parents column: groups are not written. */
    HIERARCHY_DROPPED: LOSS.HIERARCHY,
    /** A start / end / timestamp column: sessions have no time. */
    TEMPORAL_DROPPED: LOSS.TEMPORAL,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: LOSS.ROLE,
    /** An extension table the session cannot carry. */
    EXTENSION_TABLE_DROPPED: LOSS.EXTENSION_TABLE,
});

/**
 * What a Cytoscape session keeps: mixed direction, parallel edges and self-loops, integer SUIDs
 * for nodes and edges, String / Double / Integer / Long / Boolean columns and lists of them,
 * graph columns and positions. Groups, defaults, styles and time are not written.
 * @category Built-in formats
 */
export const CYS_CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: true,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "required",
    idCharset: "integer",
    dtypes: ["string", "dict", "f64", "i32", "bool", "list"],
    components: false,
    lists: true,
    json: false,
    defaults: false,
    options: false,
    hierarchy: false,
    temporal: "none",
    graphAttributes: true,
    positions: true,
    viz: false,
});

/** The roles with a slot (the label as `name`, the edge id as the SUID, positions in the view) and their read-back names. */
const SLOT_ROLES: ReadonlySet<string> = new Set(["label", "id", "position"]);
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    label: "name",
    id: EDGE_ID_COLUMN,
    position: POSITION_COLUMN,
});

/** Roles whose columns are not written as table columns (structure, or reported dropped by checkCapabilities). */
const SKIPPED_ROLES: ReadonlySet<string> = new Set([
    "directed",
    "pair",
    "mutual",
    "weight",
    "timeText",
    "parent",
    "parents",
    "start",
    "end",
    "timestamp",
    "timestamps",
    "spells",
    "open",
    "spellsOpen",
    "position",
    "color",
    "size",
    "shape",
    "thickness",
]);

/** A table of the session. */
type Domain = "node" | "edge" | "network";

/** The Java classes of the columns Cytoscape creates in every table, by lower-case name. */
const BUILT_IN: Readonly<Record<Domain, ReadonlyMap<string, string>>> = {
    node: new Map([
        ["name", "java.lang.String"],
        ["shared name", "java.lang.String"],
        ["selected", "java.lang.Boolean"],
    ]),
    edge: new Map([
        ["name", "java.lang.String"],
        ["shared name", "java.lang.String"],
        ["interaction", "java.lang.String"],
        ["shared interaction", "java.lang.String"],
        ["selected", "java.lang.Boolean"],
    ]),
    network: new Map([
        ["name", "java.lang.String"],
        ["shared name", "java.lang.String"],
        ["selected", "java.lang.Boolean"],
        ["__annotations", "java.util.List<java.lang.String>"],
    ]),
};

/** Column names graph-io's session importer gives its own columns; a table column of such a name reads back renamed. */
const IMPORTER_NAMES: Readonly<Record<Domain, ReadonlySet<string>>> = {
    node: new Set([
        POSITION_COLUMN,
        Z_COLUMN,
        GRAPHICS_COLUMN,
        PARENT_COLUMN,
        PARENTS_COLUMN,
        SUBGRAPH_COLUMN,
        NESTED_NETWORK_COLUMN,
        NETWORK_POINTER_COLUMN,
        NETWORKS_COLUMN,
    ]),
    edge: new Set([EDGE_ID_COLUMN, GRAPHICS_COLUMN]),
    network: new Set([GRAPHICS_COLUMN]),
};

const STRING = "java.lang.String";
const DOUBLE = "java.lang.Double";
const INTEGER = "java.lang.Integer";
const LONG = "java.lang.Long";
const BOOLEAN = "java.lang.Boolean";
const I32_MAX = 2147483647;

/** The folder every entry lives under (Cytoscape needs one; the name is free). */
const ROOT_FOLDER = "CytoscapeSession/";

/** The default network name. */
const DEFAULT_NAME = "Network";

/** A record-a-note callback. */
type NoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/** One column of a CyCSV table. */
interface TableColumn {
    /** The written name. */
    readonly name: string;
    /** The Java class text (`java.lang.Double`, `java.util.List<java.lang.String>`). */
    readonly javaClass: string;
    /** The cell text of a row (node, edge or network), or null for an unset cell (written empty). */
    readonly cell: (row: number) => string | null;
}

/** A column to place in a table before its name is settled. */
interface Candidate {
    /** The name it wants. */
    readonly name: string;
    /** The snapshot column it came from, or null for one the exporter makes. */
    readonly source: Column | null;
    /** The Java class text. */
    readonly javaClass: string;
    /** The cell text of a row, or null for an unset cell. */
    readonly cell: (row: number) => string | null;
}

/** Everything check() and export() agree on. */
interface Plan {
    readonly notes: LossNote[];
    readonly fatal: GraphFormatError | null;
    /** The SUID of each node. */
    readonly nodeSuids: readonly number[];
    /** The SUID of each edge (meaningless for a folded mirror). */
    readonly edgeSuids: readonly number[];
    readonly rootSuid: number;
    readonly subSuid: number;
    /** The view's SUID, or null when nothing is placed. */
    readonly viewSuid: number | null;
    /** The first SUID of the view's nodes. */
    readonly viewNodeBase: number;
    readonly name: string;
    readonly folding: PairFolding;
    readonly nodeTable: readonly TableColumn[];
    readonly edgeTable: readonly TableColumn[];
    readonly networkTable: readonly TableColumn[];
    readonly rootTable: readonly TableColumn[];
    readonly position: Column | null;
    /** The z column written as the view's z, or null. */
    readonly z: Column | null;
    /** Whether a position's own z is written as the view's z (no z column). */
    readonly positionZ: boolean;
}

// ============================================================ ids

/** Positive integer text a Long holds exactly. */
const SUID_TEXT = /^[1-9][0-9]*$/;

/**
 * The SUID a node id can keep, or null: a positive safe integer, or its canonical digits.
 * @param id - the id
 * @returns the SUID, or null
 */
function suidOf(id: NodeId): number | null {
    if (typeof id === "number") {
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    }
    if (SUID_TEXT.test(id)) {
        const n = Number(id);
        return Number.isSafeInteger(n) ? n : null;
    }
    return null;
}

/** The node SUIDs and what the id rule found. */
interface NodeSuids {
    /** The kept SUID of each node, or 0 for a node that needs a new one. */
    readonly kept: number[];
    /** The nodes that need a new SUID. */
    readonly bad: number[];
}

/**
 * The SUIDs node ids keep (the first of two ids naming one SUID keeps it).
 * @param snapshot - the snapshot
 * @returns the kept SUIDs and the nodes without one
 */
function keptNodeSuids(snapshot: GraphSnapshot): NodeSuids {
    const kept: number[] = [];
    const bad: number[] = [];
    const used = new Set<number>();
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const suid = suidOf(snapshot.ids.idOf(i));
        if (suid === null || used.has(suid)) {
            kept.push(0);
            bad.push(i);
        } else {
            used.add(suid);
            kept.push(suid);
        }
    }
    return { kept, bad };
}

/**
 * The edge SUIDs the id role column keeps: positive integers, distinct, and not node SUIDs.
 * @param snapshot - the snapshot
 * @param nodeSuids - the SUIDs nodes keep
 * @returns the kept SUID of each edge, 0 where one is generated
 */
function keptEdgeSuids(snapshot: GraphSnapshot, nodeSuids: ReadonlySet<number>): number[] {
    const column = snapshot.edges.byRole("id");
    const out = new Array<number>(snapshot.edgeCount).fill(0);
    if (column === null) {
        return out;
    }
    const used = new Set<number>();
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const value = column.isSet(e) ? column.value(e) : null;
        const suid = typeof value === "number" || typeof value === "string" ? suidOf(value) : null;
        if (suid !== null && !used.has(suid) && !nodeSuids.has(suid)) {
            used.add(suid);
            out[e] = suid;
        }
    }
    return out;
}

// ============================================================ columns

/**
 * The Java class of a scalar dtype.
 * @param column - the column (for the long origin and the u32 range)
 * @param dtype - the dtype (a list's item dtype)
 * @returns the class text
 */
function scalarClass(column: Column, dtype: string | null): string {
    switch (dtype) {
        case "bool":
            return BOOLEAN;
        case "i32":
        case "u8":
            return INTEGER;
        case "u32":
            return maxValue(column) > I32_MAX ? LONG : INTEGER;
        case "f32":
        case "f64":
            return /long$/i.test(column.meta.origin?.type ?? "") && allSafeIntegers(column) ? LONG : DOUBLE;
        default:
            return STRING;
    }
}

/**
 * The items of a set cell: a list's items, or the scalar itself.
 * @param column - the column
 * @param row - the row
 * @returns the values
 */
function itemsOf(column: Column, row: number): unknown[] {
    return column.dtype === "list" ? [...column.sliceOf(row)] : [column.value(row)];
}

/**
 * Whether every set value of a numeric column (or of its list items) is a safe integer.
 * @param column - the column
 * @returns true when Long can carry every value
 */
function allSafeIntegers(column: Column): boolean {
    for (let r = 0; r < column.length; r++) {
        if (column.isSet(r) && !itemsOf(column, r).every((v) => typeof v === "number" && Number.isSafeInteger(v))) {
            return false;
        }
    }
    return true;
}

/**
 * The largest value of a numeric column (or of its list items).
 * @param column - the column
 * @returns the maximum, 0 when empty
 */
function maxValue(column: Column): number {
    let max = 0;
    for (let r = 0; r < column.length; r++) {
        if (column.isSet(r)) {
            for (const v of itemsOf(column, r)) {
                if (typeof v === "number" && v > max) {
                    max = v;
                }
            }
        }
    }
    return max;
}

/**
 * The CyCSV text of one value of a class.
 * @param value - the value
 * @param javaClass - the scalar class
 * @param dtype - the dtype it came from
 * @returns the text Cytoscape's `valueOf` reads back
 */
function valueText(value: unknown, javaClass: string, dtype: string | null): string {
    if (javaClass === BOOLEAN) {
        return value === true ? "true" : "false";
    }
    if (javaClass === DOUBLE) {
        return formatDecimal(value as number, dtype === "f32" ? "f32" : "f64");
    }
    if (javaClass === INTEGER || javaClass === LONG) {
        return String(value);
    }
    return textOf(value);
}

/**
 * A value as text: strings as they are, numbers in their shortest form, anything else as JSON.
 * @param value - the value
 * @returns the text
 */
function textOf(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return formatF64(value);
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    if (ArrayBuffer.isView(value)) {
        return JSON.stringify(Array.from(value as unknown as ArrayLike<number>).map(finiteOrText));
    }
    return JSON.stringify(value) ?? "";
}

/**
 * A number for JSON text (JSON has no NaN or infinities: those are written as their names).
 * @param v - the number
 * @returns the number or its name
 */
function finiteOrText(v: number): number | string {
    return Number.isFinite(v) ? v : String(v);
}

/**
 * A snapshot column as a table candidate: its class and cell texts.
 * @param column - the column
 * @param name - the name it wants
 * @returns the candidate
 */
function candidateOf(column: Column, name: string): Candidate {
    const { meta } = column;
    if (column.dtype === "list") {
        const item = meta.itemDtype;
        const itemClass = scalarClass(column, item === "json" ? null : item);
        return {
            name,
            source: column,
            javaClass: `java.util.List<${itemClass}>`,
            cell: (row) =>
                column.isSet(row)
                    ? [...column.sliceOf(row)].map((v) => valueText(v, itemClass, item)).join("\n")
                    : null,
        };
    }
    const javaClass = meta.dtype === "json" || meta.components > 1 ? STRING : scalarClass(column, meta.dtype);
    return {
        name,
        source: column,
        javaClass,
        cell: (row) => (column.isSet(row) ? valueText(column.value(row), javaClass, meta.dtype) : null),
    };
}

/**
 * Settle the names of a table's columns: case-insensitively unique, `SUID` and Cytoscape's own
 * columns of another class renamed `<name>#2`, `#3`...
 * @param domain - the table
 * @param candidates - the columns in order
 * @param note - the recorder
 * @returns the table's columns (the SUID key first)
 */
function settleNames(domain: Domain, candidates: readonly Candidate[], note: NoteFn): TableColumn[] {
    const taken = new Set<string>(["suid"]);
    const out: TableColumn[] = [];
    for (const c of candidates) {
        const lower = c.name.toLowerCase();
        const builtIn = BUILT_IN[domain].get(lower);
        let { name } = c;
        if (taken.has(lower) || (builtIn !== undefined && builtIn !== c.javaClass)) {
            let k = 2;
            while (taken.has(`${lower}#${k}`)) {
                k++;
            }
            name = `${c.name}#${k}`;
            let why = `its name is taken (Cytoscape column names ignore case)`;
            if (lower === "suid") {
                why = "SUID is Cytoscape's key column";
            } else if (builtIn !== undefined && builtIn !== c.javaClass) {
                why = `Cytoscape's own "${lower}" column holds ${builtIn}`;
            }
            const set = c.source === null ? null : c.source.length - c.source.nullCount;
            note(LOSS.COLUMN_NAME_CHANGED, `${domain} column "${c.name}" is written as "${name}": ${why}`, c.name, set);
        } else if (c.source !== null && IMPORTER_NAMES[domain].has(c.name)) {
            note(
                LOSS.COLUMN_NAME_CHANGED,
                `${domain} column "${c.name}" is named like a column the importer makes itself and reads back renamed`,
                c.name,
                c.source.length - c.source.nullCount,
            );
        }
        taken.add(name.toLowerCase());
        out.push({ name, javaClass: c.javaClass, cell: c.cell });
    }
    return out;
}

/**
 * Java's `String.split("\n")`: trailing empty items are removed.
 * @param text - the cell
 * @returns the items
 */
function javaSplit(text: string): string[] {
    if (!text.includes("\n")) {
        return [text];
    }
    const items = text.split("\n");
    while (items.length > 0 && items[items.length - 1].length === 0) {
        items.pop();
    }
    return items;
}

/**
 * The notes of one written column: what CyCSV cannot hold of its cells.
 * @param domain - the table
 * @param c - the candidate
 * @param rows - the row count
 * @param note - the recorder
 */
function cellNotes(domain: Domain, c: Candidate, rows: number, note: NoteFn): void {
    const { source } = c;
    if (source === null) {
        return;
    }
    const label = `${domain} column "${source.meta.name}"`;
    const { name } = source.meta;
    const text = c.javaClass === STRING;
    const stringList = c.javaClass === `java.util.List<${STRING}>`;
    let unset = 0;
    let equations = 0;
    let lists = 0;
    let set = 0;
    const heuristic = new DictHeuristic();
    for (let r = 0; r < rows; r++) {
        const cell = c.cell(r);
        if (cell === null) {
            unset++;
        } else {
            set++;
        }
        const written = cell ?? "";
        if (text && !heuristic.decided) {
            heuristic.observe(written);
        }
        if (written.startsWith("=")) {
            equations++;
            continue;
        }
        if (source.dtype === "list") {
            let back: string[] | null = null;
            if (stringList) {
                back = written.length === 0 ? [""] : javaSplit(written);
            } else if (written.length > 0) {
                back = javaSplit(written).filter((item) => item.length > 0);
            }
            const items = cell === null ? null : [...source.sliceOf(r)].map((v) => valueText(v, "", null));
            const same =
                back === null || items === null
                    ? back === items
                    : back.length === items.length && (!stringList || back.every((b, i) => b === items[i]));
            if (!same) {
                lists++;
            }
        }
    }
    if (source.dtype === "json") {
        note(CYS_LOSS.JSON_AS_STRING, `${label} holds nested values; written as their JSON text`, name, set);
    }
    if (set === 0 && (!text || rows === 0)) {
        note(LOSS.EMPTY_COLUMN, `${label} has no value; it is not in the re-import`, name, null);
        return;
    }
    if (text && unset > 0) {
        note(
            CYS_LOSS.UNSET_AS_EMPTY_STRING,
            `${label}: ${unset} unset cell(s) are written empty and read back as ""`,
            name,
            unset,
        );
    }
    if (lists > 0) {
        note(
            CYS_LOSS.LIST_ITEMS,
            `${label}: ${lists} list cell(s) read back changed (an unset or empty list of text as [""], an empty list of numbers unset, trailing empty items dropped, items holding a newline split)`,
            name,
            lists,
        );
    }
    if (equations > 0) {
        note(
            CYS_LOSS.TEXT_AS_EQUATION,
            `${label}: ${equations} cell(s) start with "=", which Cytoscape reads as a formula (an error cell); graph-io reads them back as text`,
            name,
            equations,
        );
    }
    if (text && (source.dtype === "string" || source.dtype === "dict")) {
        const readsAs = heuristic.decide();
        if (readsAs !== source.dtype) {
            note(LOSS.STORAGE_CLASS, `${label} reads back as ${readsAs} (the cardinality heuristic)`, name, null);
        }
    }
}

/**
 * Whether a column is the z slot (a role-less f64 `z` column, as the importer makes it).
 * @param column - the column
 * @returns true for the z column
 */
function isZ(column: Column): boolean {
    return column.meta.name === Z_COLUMN && column.meta.dtype === "f64" && column.meta.role === null;
}

/**
 * The candidates of the node or edge table: the label as `name`, then the exporter's own columns,
 * then every other column in order.
 * @param snapshot - the snapshot
 * @param domain - node or edge
 * @param own - the exporter's columns after the label
 * @param skip - columns written elsewhere
 * @param note - the recorder
 * @returns the candidates
 */
function elementCandidates(
    snapshot: GraphSnapshot,
    domain: "node" | "edge",
    own: readonly Candidate[],
    skip: (column: Column) => boolean,
    note: NoteFn,
): Candidate[] {
    const table = domain === "node" ? snapshot.nodes : snapshot.edges;
    const label = table.byRole("label");
    const out: Candidate[] = [];
    if (label !== null) {
        const c = candidateOf(label, "name");
        out.push({ ...c, javaClass: STRING, cell: (row) => (label.isSet(row) ? textOf(label.value(row)) : null) });
        if (label.dtype !== "string" && label.dtype !== "dict") {
            note(
                LOSS.DTYPE,
                `${domain} label column "${label.meta.name}" (${label.dtype}) is written as text and reads back as string`,
                label.meta.name,
                label.length - label.nullCount,
            );
        }
    }
    out.push(...own);
    for (const column of table) {
        const { role } = column.meta;
        if (column === label || (role !== null && (SKIPPED_ROLES.has(role) || role === "id")) || skip(column)) {
            continue;
        }
        out.push(candidateOf(column, column.meta.name));
        if (
            label === null &&
            role === null &&
            column.meta.name === "name" &&
            scalarClass(column, column.dtype) === STRING
        ) {
            note(
                LOSS.ROLE_ASSUMED,
                `${domain} column "name" is Cytoscape's name and reads back as the label`,
                "name",
                column.length - column.nullCount,
            );
        }
    }
    return out;
}

/**
 * Settle a table and record the notes of its cells.
 * @param domain - the table
 * @param candidates - its columns
 * @param rows - its row count
 * @param note - the recorder
 * @returns the columns
 */
function planTable(domain: Domain, candidates: readonly Candidate[], rows: number, note: NoteFn): TableColumn[] {
    for (const c of candidates) {
        cellNotes(domain, c, rows, note);
    }
    return settleNames(domain, candidates, note);
}

// ============================================================ the plan

/** The SUIDs of the nodes and edges, and what the id rule found. */
interface PlannedIds {
    readonly nodeSuids: readonly number[];
    readonly edgeSuids: readonly number[];
    /** The next free SUID. */
    readonly next: number;
    /** E_INVALID_ID when the ids cannot be written, else null. */
    readonly fatal: GraphFormatError | null;
    /** Whether nodes were renumbered (the originals are written). */
    readonly mangled: boolean;
}

/**
 * The SUIDs: node ids that are positive integers keep them, the others get new ones (or refuse
 * under sanitizeIds "error"); edge ids likewise, from the id role column. Every new SUID comes
 * from one counter above the kept ones.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @param note - the recorder
 * @returns the SUIDs
 */
function planIds(snapshot: GraphSnapshot, common: ResolvedExportOptions, note: NoteFn): PlannedIds {
    let fatal: GraphFormatError | null = null;
    const { kept, bad } = keptNodeSuids(snapshot);
    let collisions = 0;
    const texts = new Set<string>();
    let numeric = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        numeric += typeof id === "number" ? 1 : 0;
        const text = String(id);
        if (texts.has(text)) {
            collisions++;
        }
        texts.add(text);
    }
    if (collisions > 0) {
        note(
            LOSS.ID_TEXT_COLLISION,
            `${collisions} node id(s) share their text with another id (a number and a string); the save fails with E_INVALID_ID`,
            null,
            collisions,
        );
        fatal = new GraphFormatError("E_INVALID_ID", `${collisions} node id(s) share their text with another id`, {
            reason: "collision",
            count: collisions,
        });
    }
    if (numeric > 0) {
        note(LOSS.ID_TEXT_TYPE, `${numeric} numeric node id(s) read back as their text`, null, numeric);
    }
    if (bad.length > 0) {
        if (common.sanitizeIds === "mangle") {
            note(
                LOSS.ID_MANGLED,
                `${bad.length} node id(s) that are not positive integers get new SUIDs; the originals are kept in the "${ORIGINAL_ID_ATTRIBUTE}" column (restored by restoreMangledIds)`,
                null,
                bad.length,
            );
        } else {
            note(
                LOSS.ID_CHARSET,
                `${bad.length} node id(s) are not positive integers (Cytoscape SUIDs); the save fails unless sanitizeIds is "mangle"`,
                null,
                bad.length,
            );
            const first = snapshot.ids.idOf(bad[0]);
            fatal ??= new GraphFormatError(
                "E_INVALID_ID",
                `${bad.length} node id(s) cannot be written as Cytoscape SUIDs (first: ${JSON.stringify(first)} at index ${bad[0]}); pass sanitizeIds: "mangle" to rewrite them`,
                { reason: "charset", charset: "integer", count: bad.length, index: bad[0] },
            );
        }
    }
    const nodeSet = new Set(kept.filter((s) => s > 0));
    const edgeKept = keptEdgeSuids(snapshot, nodeSet);
    let next = 1;
    for (const s of [...nodeSet, ...edgeKept]) {
        next = Math.max(next, s + 1);
    }
    const nodeSuids = kept.map((s) => (s > 0 ? s : next++));
    const idColumn = snapshot.edges.byRole("id");
    let generated = 0;
    const edgeSuids = edgeKept.map((s) => {
        if (s > 0) {
            return s;
        }
        generated++;
        return next++;
    });
    if (idColumn !== null && generated > 0) {
        note(
            LOSS.EDGE_IDS_GENERATED,
            `${generated} edge(s) have no distinct positive integer id in "${idColumn.meta.name}"; they are written with generated SUIDs`,
            idColumn.meta.name,
            generated,
        );
    }
    if (idColumn !== null && idColumn.dtype !== "string") {
        note(
            LOSS.DTYPE,
            `edge id column "${idColumn.meta.name}" is ${idColumn.dtype}; edge ids read back as text`,
            idColumn.meta.name,
            snapshot.edgeCount - idColumn.nullCount,
        );
    }
    return { nodeSuids, edgeSuids, next, fatal, mangled: common.sanitizeIds === "mangle" && bad.length > 0 };
}

/**
 * The columns of the network's own table: its name (from meta.name unless a text graph column
 * holds it), its description, and the graph columns.
 * @param snapshot - the snapshot
 * @param name - the network name
 * @returns the candidates
 */
function networkCandidates(snapshot: GraphSnapshot, name: string): Candidate[] {
    const out: Candidate[] = [];
    const graphName = snapshot.graph.get("name");
    if (graphName === null || (graphName.dtype !== "string" && graphName.dtype !== "dict")) {
        out.push({ name: "name", source: null, javaClass: STRING, cell: () => name });
    }
    const { description } = snapshot.meta;
    if (description !== null && snapshot.graph.get("description") === null) {
        out.push({ name: "description", source: null, javaClass: STRING, cell: () => description });
    }
    for (const column of snapshot.graph) {
        out.push(candidateOf(column, column.meta.name));
    }
    return out;
}

/**
 * Plan an export: the notes, the fatal condition, the SUIDs and the tables.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @returns the plan
 */
function plan(snapshot: GraphSnapshot, common: ResolvedExportOptions): Plan {
    const notes: LossNote[] = [];
    const note: NoteFn = (code, message, column = null, count = null) => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    for (const gen of checkCapabilities(snapshot, CYS_CAPABILITIES, common, {
        roles: SLOT_ROLES,
        roleNames: ROLE_NAMES,
        positionDtype: "f32",
    })) {
        // json is reported per column below; ids by the SUID rule (positive integers)
        if (gen.code !== LOSS.JSON && gen.code !== LOSS.ID_CHARSET && gen.code !== LOSS.ID_MANGLED) {
            notes.push(gen);
        }
    }

    const ids = planIds(snapshot, common, note);
    const { nodeSuids, edgeSuids, mangled, fatal } = ids;
    let { next } = ids;
    const rootSuid = next++;
    const subSuid = next++;

    // direction
    const folding = pairFolding(snapshot);
    if (folding.mutualCount > 0) {
        note(
            LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair(s) are written as two directed edges; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }

    // positions
    const position = snapshot.nodes.byRole("position");
    const z = [...snapshot.nodes].find(isZ) ?? null;
    const positionZ = position !== null && z === null;
    if (position !== null) {
        positionNotes(position, z, note);
    }
    const placed =
        (position !== null && position.nullCount < position.length) || (z !== null && z.nullCount < z.length);
    const viewSuid = placed ? next++ : null;
    const viewNodeBase = next;

    // node table
    const nodeOwn: Candidate[] = mangled
        ? [
              {
                  name: ORIGINAL_ID_ATTRIBUTE,
                  source: null,
                  javaClass: STRING,
                  // every node carries its original, so an empty id ("") is told apart from an unset cell
                  cell: (row) => String(snapshot.ids.idOf(row)),
              },
          ]
        : [];
    const nodeTable = planTable(
        "node",
        elementCandidates(snapshot, "node", nodeOwn, (c) => placed && c === z, note),
        snapshot.nodeCount,
        note,
    );

    // edge table
    const weights: ExplicitWeights = explicitWeights(snapshot);
    const plainWeight = snapshot.edges.get("weight");
    if (plainWeight !== null && plainWeight.meta.role === null && !weights.weighted) {
        note(LOSS.WEIGHT_KEY_CLASH, `edge column "weight" reads back as the edge weight`, "weight", null);
    }
    const edgeOwn: Candidate[] = weights.weighted
        ? [
              {
                  name: "weight",
                  source: null,
                  javaClass: DOUBLE,
                  cell: (e) => (weights.isExplicit(e) ? formatDecimal(weights.value(e)) : null),
              },
          ]
        : [];
    const edgeRows = snapshot.edgeCount;
    const edgeTable = planTable(
        "edge",
        elementCandidates(snapshot, "edge", edgeOwn, () => false, note),
        edgeRows,
        note,
    );

    const name = snapshot.meta.name ?? DEFAULT_NAME;
    const networkTable = planTable("network", networkCandidates(snapshot, name), 1, note);
    const rootTable: TableColumn[] = [{ name: "name", javaClass: STRING, cell: () => name }];
    return {
        notes,
        fatal,
        nodeSuids,
        edgeSuids,
        rootSuid,
        subSuid,
        viewSuid,
        viewNodeBase,
        name,
        folding,
        nodeTable,
        edgeTable,
        networkTable,
        rootTable,
        position,
        z: placed ? z : null,
        positionZ,
    };
}

/**
 * The notes of the position column: its shape, non-finite coordinates, and a z that reads back
 * in the z column.
 * @param position - the position column
 * @param z - the z column, or null
 * @param note - the recorder
 */
function positionNotes(position: Column, z: Column | null, note: NoteFn): void {
    const { name, components } = position.meta;
    if (components !== 3) {
        note(
            CYS_LOSS.POSITION,
            `position column "${name}" has ${components} component(s) and reads back with 3`,
            name,
            null,
        );
    }
    let nonFinite = 0;
    let depth = 0;
    for (let r = 0; r < position.length; r++) {
        if (!position.isSet(r)) {
            continue;
        }
        const xyz = Array.from(position.value(r) as ArrayLike<number>);
        if (xyz.slice(0, 2).some((v) => !Number.isFinite(v))) {
            nonFinite++;
        } else if ((xyz[2] ?? 0) !== 0) {
            depth++;
        }
    }
    if (nonFinite > 0) {
        note(
            CYS_LOSS.POSITION,
            `${nonFinite} position(s) with a non-finite coordinate are not written`,
            name,
            nonFinite,
        );
    }
    if (depth > 0) {
        note(
            CYS_LOSS.POSITION,
            z === null
                ? `${depth} position(s) have a z; it is written as the view's z and reads back in the z column`
                : `${depth} position(s) have a z, but the view's z holds the z column; the position z is lost`,
            name,
            depth,
        );
    }
}

// ============================================================ writing

/**
 * Cytoscape's `SessionUtil.escape`: Java's `URLEncoder.encode(text, "UTF-8")` (letters, digits
 * and `.-*_` kept, space as `+`, everything else `%XX`), then `-` as `%2D`.
 * @param text - the text
 * @returns the escaped text
 * @category Plugin helpers
 */
export function sessionEscape(text: string): string {
    const wellFormed = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�");
    return encodeURIComponent(wellFormed)
        .replace(/[!~'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/%20/g, "+")
        .replace(/-/g, "%2D");
}

/**
 * One CyCSV table (schema version 1): the key column SUID, then the columns.
 * @param title - the table title
 * @param columns - the columns
 * @param rows - the SUID of each row, with its row index
 * @yields the table text
 * @returns nothing
 */
function* cyTable(
    title: string,
    columns: readonly TableColumn[],
    rows: Iterable<readonly [number, number]>,
): Generator<string, void, undefined> {
    const line = (cells: readonly string[]): string => `${cells.map((c) => quoteCsvCell(c)).join(",")}\n`;
    yield line(["CyCSV-Version", "1"]);
    yield line(["SUID", ...columns.map((c) => c.name)]);
    yield line([LONG, ...columns.map((c) => c.javaClass)]);
    yield line(["", ...columns.map(() => "mutable")]);
    yield line([title, ""]);
    for (const [suid, row] of rows) {
        yield line([String(suid), ...columns.map((c) => c.cell(row) ?? "")]);
    }
}

/** The XML declaration and the namespaces of a session XGMML document. */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NAMESPACES = `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="${XLINK_NAMESPACE}" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cy="${CY_NAMESPACE}" xmlns="${XGMML_NAMESPACE}"`;

/**
 * The network file: the root network holding the one registered subnetwork, nodes and edges by
 * SUID. No attributes: a 3.x session keeps them in the tables.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the document's text
 * @returns nothing
 */
function* networkFile(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    const label = !hasIllegalXmlChar(p.name) ? ` label="${escapeXmlAttribute(p.name)}"` : "";
    yield XML_DECLARATION;
    yield `<graph id="${p.rootSuid}"${label} directed="${snapshot.directed ? "1" : "0"}" cy:view="0" cy:registered="0" cy:documentVersion="3.0" ${NAMESPACES}>\n`;
    yield `  <att>\n    <graph id="${p.subSuid}"${label} cy:registered="1">\n`;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        yield `      <node id="${p.nodeSuids[i]}"/>\n`;
    }
    const { src, dst } = snapshot.edgeList();
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (p.folding.folded(e)) {
            continue;
        }
        const directed = snapshot.directed && p.folding.sourceDirected(e);
        yield `      <edge id="${p.edgeSuids[e]}" source="${p.nodeSuids[src[e]]}" target="${p.nodeSuids[dst[e]]}" cy:directed="${directed ? "1" : "0"}"/>\n`;
    }
    yield "    </graph>\n  </att>\n</graph>\n";
}

/**
 * The view file: one view node per placed node, x and y (y negated back to screen coordinates)
 * and z.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param viewSuid - the view's SUID
 * @yields the document's text
 * @returns nothing
 */
function* viewFile(snapshot: GraphSnapshot, p: Plan, viewSuid: number): Generator<string, void, undefined> {
    yield XML_DECLARATION;
    yield `<graph id="${viewSuid}" label="${viewSuid}" cy:view="1" cy:networkId="${p.subSuid}" cy:visualStyle="default" cy:rendererId="org.cytoscape.ding" cy:documentVersion="3.0" ${NAMESPACES}>\n`;
    let view = p.viewNodeBase;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const coords: string[] = [];
        if (p.position?.isSet(i) === true) {
            const [x, y, z] = Array.from(p.position.value(i) as ArrayLike<number>);
            if (Number.isFinite(x) && Number.isFinite(y)) {
                coords.push(`x="${formatF32(x)}"`, `y="${formatF32(y === 0 ? 0 : -y)}"`);
                if (p.positionZ && z !== undefined && z !== 0 && Number.isFinite(z)) {
                    coords.push(`z="${formatF32(z)}"`);
                }
            }
        }
        if (p.z?.isSet(i) === true) {
            coords.push(`z="${formatDecimal(p.z.value(i) as number)}"`);
        }
        if (coords.length > 0) {
            yield `  <node id="${view++}" cy:nodeId="${p.nodeSuids[i]}">\n    <graphics ${coords.join(" ")}/>\n  </node>\n`;
        }
    }
    yield "</graph>\n";
}

/**
 * The text of string parts, UTF-8 encoded.
 * @param parts - the parts
 * @returns the bytes
 */
function encode(parts: Iterable<string>): Uint8Array {
    let text = "";
    for (const part of parts) {
        text += part;
    }
    return new TextEncoder().encode(text);
}

/**
 * The archive's entries, each built when the zip writer asks for it.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the entries
 * @returns nothing
 */
function* entries(snapshot: GraphSnapshot, p: Plan): Generator<ZipWriteEntry, void, undefined> {
    if (p.fatal !== null) {
        throw p.fatal;
    }
    const name = sessionEscape(p.name);
    const tables = `${ROOT_FOLDER}tables/${p.subSuid}-${name}/LOCAL_ATTRS-org.cytoscape.model.`;
    const rowsOf = (suids: readonly number[], skip?: (row: number) => boolean): [number, number][] =>
        suids.flatMap((suid, row) => (skip?.(row) === true ? [] : [[suid, row] as [number, number]]));
    yield { name: `${ROOT_FOLDER}3.0.0.version`, data: new Uint8Array(0) };
    yield { name: `${ROOT_FOLDER}networks/${p.rootSuid}-${name}.xgmml`, data: encode(networkFile(snapshot, p)) };
    yield {
        name: `${tables}CyNode-${sessionEscape(`${p.name} default node`)}.cytable`,
        data: encode(cyTable(`${p.name} default node`, p.nodeTable, rowsOf(p.nodeSuids))),
    };
    yield {
        name: `${tables}CyEdge-${sessionEscape(`${p.name} default edge`)}.cytable`,
        data: encode(
            cyTable(
                `${p.name} default edge`,
                p.edgeTable,
                rowsOf(p.edgeSuids, (e) => p.folding.folded(e)),
            ),
        ),
    };
    yield {
        name: `${tables}CyNetwork-${sessionEscape(`${p.name} default network`)}.cytable`,
        data: encode(cyTable(`${p.name} default network`, p.networkTable, [[p.subSuid, 0]])),
    };
    yield {
        name: `${ROOT_FOLDER}tables/${p.rootSuid}-${name}/LOCAL_ATTRS-org.cytoscape.model.CyNetwork-${p.rootSuid}+default+network.cytable`,
        data: encode(cyTable(`${p.rootSuid} default network`, p.rootTable, [[p.rootSuid, 0]])),
    };
    if (p.viewSuid !== null) {
        yield {
            name: `${ROOT_FOLDER}views/${p.subSuid}-${p.viewSuid}-${name}.xgmml`,
            data: encode(viewFile(snapshot, p, p.viewSuid)),
        };
    }
}

/**
 * The archive as byte chunks.
 * @param snapshot - the snapshot
 * @param options - the options
 * @yields the bytes
 * @returns nothing
 */
async function* write(
    snapshot: GraphSnapshot,
    options: (CysExportOptions) | undefined,
): AsyncGenerator<Uint8Array, void, undefined> {
    const p = plan(snapshot, resolveExportOptions(options));
    await Promise.resolve();
    yield* writeZip(entries(snapshot, p));
}

/**
 * The Cytoscape session exporter.
 * @category Built-in formats
 */
export const cysExporter: GraphExporter<CysExportOptions> = Object.freeze({
    format: FORMAT,
    capabilities: CYS_CAPABILITIES,

    /**
     * Pre-flight: what export() would lose, without writing anything.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: CysExportOptions): readonly LossNote[] {
        return Object.freeze([...plan(snapshot, resolveExportOptions(options)).notes]);
    },

    /**
     * Write the session as zip bytes (stored entries, one at a time).
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the bytes
     */
    export(snapshot: GraphSnapshot, options?: CysExportOptions): AsyncIterable<Uint8Array> {
        return write(snapshot, options);
    },

    /**
     * A session is a zip archive, not text: always rejects with E_UNSUPPORTED (use export()).
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns never
     */
    exportToString(snapshot: GraphSnapshot, options?: CysExportOptions): Promise<string> {
        void snapshot;
        void options;
        return Promise.reject(
            new GraphFormatError("E_UNSUPPORTED", "a Cytoscape session is binary; use export()", { reason: "binary" }),
        );
    },
});
