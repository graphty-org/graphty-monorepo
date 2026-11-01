/**
 * The GEXF exporter (design sections 8.5, 3.6, 3.7, 5.1, 5.10; research note 07 section 9): writes
 * GEXF 1.3 by default (1.2 on request), restoring declared attributes from `origin` (id, title,
 * type, defaults, options), the viz namespace from the position / color / size / shape /
 * thickness role columns, containment from the parent / parents columns, element lifetimes from
 * the temporal role columns (with the text companions of design section 5.1), and dynamic
 * attribute values from the temporal extension tables of design section 5.10. Expanded
 * mixed-direction pairs are folded back through the `pair` / `directed` / `mutual` roles into one
 * undirected or mutual edge; weights are written for explicit rows only (the role-weight column's
 * validity, design section 3.7). check() lists every loss before anything is written: the generic
 * capability gaps (W_OPEN_INTERVAL in 1.3, u32 / u8 dtypes, strides, nested json, graph
 * attributes, foreign extension tables) and the GEXF-specific ones (1.2 has no `kind`, no
 * timestamps and no typed lists; role columns of an unexpected shape; roles the format cannot
 * carry; attribute titles the importer would rename).
 */

import {
    type AttributeTable,
    type Column,
    GraphFormatError,
    type GraphSnapshot,
    INVALID_INDEX,
} from "@graphty/graph-format";

import { mapDeclaredType } from "../../common/declared-types.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { escapeXmlAttribute, escapeXmlText } from "../../common/escape.js";
import { capabilities, checkCapabilities, LOSS, sanitizeIds } from "../../common/export.js";
import { formatF32, formatF64, formatInteger } from "../../common/format.js";
import { isCanonicalIntegerText } from "../../common/ids.js";
import { joinListText } from "../../common/lists.js";
import { type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { formatTemporal, formatTimeValue, type TimeFormat } from "../../common/temporal.js";
import { explicitWeights } from "../../common/weights.js";
import { encodeChunks, joinText } from "../../common/writer.js";
import { xmlIllegalTextNotes } from "../../common/xml.js";
import type { ExporterStyleOptions } from "../../styles/io/writer.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import {
    canonicalScalarType,
    GEXF_FORMAT,
    GEXF_NAMESPACES,
    type GexfEdgeType,
    type GexfVersion,
    isListType,
    isScalarType,
    NODE_COLUMNS,
    OPEN_END,
    OPEN_START,
    parseTemporalTableName,
    RESERVED_EDGE_NAMES,
    RESERVED_NODE_NAMES,
    TEMPORAL_COLUMNS,
    VIZ_NAMESPACE,
} from "./schema.js";
import { GEXF_STYLE_CAPABILITIES, type GexfStyledExport, gexfStyledExport } from "./styles.js";

/** What the writer takes: the format's options, the common ones and the styles. */
type GexfWriteOptions = GexfExportOptions & CommonExportOptions & ExporterStyleOptions;

/**
 * The format-specific options of the GEXF exporter.
 * @category Built-in formats
 */
export interface GexfExportOptions extends CommonExportOptions {
    /**
     * The GEXF version to write.
     * @defaultValue "1.3"
     */
    version?: GexfVersion | undefined;
}

/**
 * LossNote codes specific to the GEXF exporter, next to the shared LOSS codes.
 * @category Built-in formats
 */
export const GEXF_LOSS = Object.freeze({
    /** GEXF 1.2 has no parallel-edge `kind`; the kind column is dropped. */
    KIND_DROPPED: "W_GEXF_KIND_DROPPED",
    /** GEXF 1.2 has no timestamps; a timestamp becomes a closed interval [t, t]. */
    TIMESTAMP_AS_INTERVAL: "W_TIMESTAMP_AS_INTERVAL",
    /** GEXF 1.2 liststring items are separated by `|`; an item containing one cannot be split back. */
    LIST_SEPARATOR: "W_LIST_SEPARATOR",
    /** A role column of a shape GEXF cannot map (a string `start`, a 2-component color); written as a plain attribute. */
    ROLE_SHAPE: "W_ROLE_SHAPE",
    /** A temporal extension table without the element / start / end / value columns. */
    TEMPORAL_TABLE_SHAPE: "W_TEMPORAL_TABLE_SHAPE",
    /** An attribute's name is one GEXF reserves, so a GEXF import would give it another name. */
    ATTRIBUTE_RENAMED: "W_ATTRIBUTE_RENAMED",
    /** A cell, default or option the declared type cannot express (skipped). */
    VALUE_UNWRITABLE: "W_VALUE_UNWRITABLE",
    /**
     * An attribute type that this GEXF version does not have (GEXF 1.2 has no date, dateTime or typed lists) is
     * written as the nearest type it has.
     */
    DECLARED_TYPE: "W_DECLARED_TYPE",
    /**
     * A node id that reads back as a different type: a number that is not an integer comes back as text, and text that
     * looks like an integer ("42") comes back as a number, unless you read the file with `ids: "string"` or `ids:
     * "keep"`.
     */
    ID_TEXT_TYPE: LOSS.ID_TEXT_TYPE,
    /** A numeric edge id column: GEXF edge ids read back as strings. */
    EDGE_ID_TEXT: "W_GEXF_EDGE_ID_TEXT",
    /**
     * A visual attribute (position, color, size, thickness) is stored at another precision than the importer gives it;
     * a position reads back as a 64-bit float, a color, size or thickness as a 32-bit float.
     */
    VIZ_DTYPE: "W_GEXF_VIZ_DTYPE",
    /**
     * An attribute named `weight` without the weight role reads back as the edge weight, because GEXF reads weights
     * from `weight` by default.
     */
    WEIGHT_KEY_CLASH: LOSS.WEIGHT_KEY_CLASH,
    /**
     * A text attribute stored as a dictionary, without a declared list of allowed values, reads back with its distinct
     * values as that list.
     */
    OPTIONS_GAINED: LOSS.OPTIONS_GAINED,
    /** A text value holds a character XML 1.0 forbids (most control characters); the save fails with E_COLUMN_TYPE. */
    XML_ILLEGAL_CHAR: LOSS.XML_ILLEGAL_CHAR,
});

const DTYPES_KEPT = ["f32", "f64", "i32", "bool", "dict", "string"] as const;

/** GEXF 1.3: everything the model has but nested json, strides, graph attributes and open intervals. */
const CAPABILITIES_1_3: ExportCapabilities = capabilities({
    mixedDirection: true,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "optional",
    idCharset: "any",
    dtypes: DTYPES_KEPT,
    lists: true,
    defaults: true,
    options: true,
    hierarchy: true,
    temporal: "dynamic-values",
    positions: true,
    viz: true,
});

/** GEXF 1.2: no parallel edges, required edge ids, `liststring` only. */
const CAPABILITIES_1_2: ExportCapabilities = capabilities({
    ...CAPABILITIES_1_3,
    multiEdges: false,
    edgeIds: "required",
});

const STRUCTURAL_ROLES: ReadonlySet<string> = new Set(["directed", "pair", "mutual", "weight", "timeText"]);

/** The attribute title the importer reads THE weight from by default (its weightFrom default). */
const DEFAULT_WEIGHT_TITLE = "weight";
const NUMERIC_DTYPES: ReadonlySet<string> = new Set(["f32", "f64", "i32", "u32", "u8"]);
const TEXT_DTYPES: ReadonlySet<string> = new Set(["string", "dict"]);

/** Formats one cell value as GEXF text; null when the value cannot be expressed. */
type ValueFormatter = (value: unknown) => string | null;

/** The GEXF type of a column and how its values are written. */
interface TypedAttribute {
    /** The type text written in the declaration. */
    readonly type: string;
    /** Whether it is a list type. */
    readonly list: boolean;
    /** The item type of a list, the type itself otherwise. */
    readonly itemType: string;
    /** The value formatter. */
    readonly format: ValueFormatter;
    /** A declared type the target version cannot express (written as `type` instead), or null. */
    readonly dropped: string | null;
}

/** A temporal extension table resolved to its columns (design section 5.10). */
interface TemporalTable {
    readonly element: Column;
    readonly start: Column;
    readonly end: Column;
    readonly value: Column;
    readonly startText: Column | null;
    readonly endText: Column | null;
    readonly valueText: Column | null;
    readonly open: Column | null;
    /** Row indices per element index. */
    readonly rows: ReadonlyMap<number, readonly number[]>;
    readonly format: ValueFormatter;
}

/** One `<attribute>` declaration and how its values are written. */
interface AttributeSpec {
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly column: Column | null;
    /** The text companion of a temporal-typed column, used only when the written type is temporal. */
    readonly companion: Column | null;
    readonly format: ValueFormatter;
    readonly defaultText: string | null;
    readonly optionsText: string | null;
    readonly dynamic: boolean;
    readonly table: TemporalTable | null;
}

/** The role columns of one domain, each null when absent or of an unusable shape. */
interface RoleColumns {
    label: Column | null;
    id: Column | null;
    kind: Column | null;
    start: Column | null;
    end: Column | null;
    timestamp: Column | null;
    spells: Column | null;
    spellsOpen: Column | null;
    timestamps: Column | null;
    open: Column | null;
    position: Column | null;
    color: Column | null;
    size: Column | null;
    shape: Column | null;
    shapeUri: Column | null;
    thickness: Column | null;
    parent: Column | null;
    parents: Column | null;
    /** Text companions keyed by the column they accompany. */
    readonly companions: ReadonlyMap<string, Column>;
}

/** Everything check() decides and export() writes from. */
/** How a temporal document writes its times: as intervals, as timestamps, or not at all. */
type TimeRepresentation = "interval" | "timestamp" | null;

interface ExportPlan {
    readonly version: GexfVersion;
    readonly options: ResolvedExportOptions;
    readonly notes: LossNote[];
    readonly nodeRoles: RoleColumns;
    readonly edgeRoles: RoleColumns;
    readonly nodeAttrs: readonly AttributeSpec[];
    readonly edgeAttrs: readonly AttributeSpec[];
    readonly timeFormat: TimeFormat | null;
    readonly temporal: boolean;
    readonly timeRepresentation: TimeRepresentation;
}

/** Records one loss note. */
type NoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/**
 * Resolve the format-specific options.
 * @param options - the caller's options
 * @returns the version to write
 */
function resolveVersion(options: (GexfExportOptions & CommonExportOptions) | undefined): GexfVersion {
    const version = options?.version;
    if (version === undefined) {
        return "1.3";
    }
    if (version !== "1.2" && version !== "1.3") {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option version: ${JSON.stringify(version)} is not "1.2" or "1.3"`,
            {
                option: "version",
                found: version,
                supported: ["1.2", "1.3"],
            },
        );
    }
    return version;
}

/**
 * Decide everything about an export: the capability notes, the role columns of each domain, the
 * attribute declarations and their formatters, the temporal tables and the graph header values.
 * @param snapshot - the snapshot
 * @param options - the caller's options
 * @returns the plan
 */
function planExport(
    snapshot: GraphSnapshot,
    options: (GexfExportOptions & CommonExportOptions) | undefined,
): ExportPlan {
    const version = resolveVersion(options);
    const resolved = resolveExportOptions(options);
    const caps = version === "1.2" ? CAPABILITIES_1_2 : CAPABILITIES_1_3;
    const notes = [
        ...checkCapabilities(snapshot, caps, resolved, {
            openIntervals: version === "1.2",
            temporalText: true,
            positionDtype: "f64",
            roles: MAPPED_ROLES,
            // GEXF 1.2 has no edge kind: the kind column is dropped (W_GEXF_KIND_DROPPED), not renamed
            roleNames: version === "1.2" ? ROLE_NAMES_1_2 : ROLE_NAMES,
        }),
    ];
    const note = (code: string, message: string, column: string | null = null, count: number | null = null): void => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    notes.push(...xmlIllegalTextNotes(snapshot));
    noteIdTypes(snapshot, note);
    const tables = collectTemporalTables(snapshot, version, note);
    const nodeRoles = collectRoles(snapshot.nodes, "node", note);
    const edgeRoles = collectRoles(snapshot.edges, "edge", note);
    const nodeAttrs = collectAttributes(snapshot, "node", nodeRoles, tables.get("node") ?? new Map(), version, note);
    const edgeAttrs = collectAttributes(snapshot, "edge", edgeRoles, tables.get("edge") ?? new Map(), version, note);
    const temporal =
        hasLifetime(nodeRoles) ||
        hasLifetime(edgeRoles) ||
        nodeAttrs.some((a) => a.dynamic) ||
        edgeAttrs.some((a) => a.dynamic);
    if (version === "1.2") {
        noteVersion12Losses(snapshot, nodeRoles, edgeRoles, note);
    }
    const { meta } = snapshot;
    return {
        version,
        options: resolved,
        notes,
        nodeRoles,
        edgeRoles,
        nodeAttrs,
        edgeAttrs,
        timeFormat: meta.timeFormat,
        temporal,
        timeRepresentation: planTimeRepresentation(meta.timeRepresentation, temporal, nodeRoles, edgeRoles),
    };
}

/**
 * Note node ids that change type on re-import and a non-text edge id column.
 * @param snapshot - the snapshot
 * @param note - the note recorder
 */
function noteIdTypes(snapshot: GraphSnapshot, note: NoteFn): void {
    let typeChanges = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        if (typeof id === "number" ? !Number.isSafeInteger(id) : isCanonicalIntegerText(id)) {
            typeChanges++;
        }
    }
    if (typeChanges > 0) {
        note(
            GEXF_LOSS.ID_TEXT_TYPE,
            `${typeChanges} node id${plural(typeChanges)} ${agree(typeChanges, "changes", "change")} type when read back under ids: "canonical" (string ids that are integer text, non-integer numbers); the file's idtype is not honored by the importer`,
            null,
            typeChanges,
        );
    }
    const edgeIds = snapshot.edges.byRole("id");
    if (edgeIds !== null && edgeIds.dtype !== "string" && edgeIds.dtype !== "dict") {
        note(
            GEXF_LOSS.EDGE_ID_TEXT,
            `edge id column "${edgeIds.meta.name}" is ${edgeIds.dtype}; GEXF edge ids read back as strings`,
            edgeIds.meta.name,
            snapshot.edgeCount - edgeIds.nullCount,
        );
    }
}

/**
 * Note what a GEXF 1.2 export cannot hold: timestamps (element and graph) and the edge kind.
 * @param snapshot - the snapshot
 * @param nodeRoles - the node role columns
 * @param edgeRoles - the edge role columns
 * @param note - the note recorder
 */
function noteVersion12Losses(
    snapshot: GraphSnapshot,
    nodeRoles: RoleColumns,
    edgeRoles: RoleColumns,
    note: NoteFn,
): void {
    for (const [domain, roles] of [
        ["node", nodeRoles],
        ["edge", edgeRoles],
    ] as const) {
        if (roles.timestamp !== null || roles.timestamps !== null) {
            note(
                GEXF_LOSS.TIMESTAMP_AS_INTERVAL,
                `${domain} timestamps are written as closed intervals; GEXF 1.2 has no timestamp representation`,
                (roles.timestamp ?? roles.timestamps)?.meta.name ?? null,
                null,
            );
        }
    }
    if (graphExtraText(snapshot, "timestamp") !== null) {
        note(
            GEXF_LOSS.TIMESTAMP_AS_INTERVAL,
            "the graph timestamp is written as a closed interval (start = end); GEXF 1.2 has no timestamp representation",
            null,
            null,
        );
    }
    if (edgeRoles.kind !== null) {
        note(
            GEXF_LOSS.KIND_DROPPED,
            `edge column "${edgeRoles.kind.meta.name}" (kind) cannot be written; GEXF 1.2 has no edge kind`,
            edgeRoles.kind.meta.name,
            edgeRoles.kind.length - edgeRoles.kind.nullCount,
        );
    }
}

/**
 * The graph's time representation: the declared one, else "timestamp" for a temporal graph whose
 * elements carry only timestamps.
 * @param declared - the snapshot's declared time representation
 * @param temporal - whether the export is temporal
 * @param nodeRoles - the node role columns
 * @param edgeRoles - the edge role columns
 * @returns the representation, or null
 */
function planTimeRepresentation(
    declared: TimeRepresentation,
    temporal: boolean,
    nodeRoles: RoleColumns,
    edgeRoles: RoleColumns,
): TimeRepresentation {
    if (declared !== null || !temporal) {
        return declared;
    }
    const timestampOnly =
        (nodeRoles.timestamp !== null || edgeRoles.timestamp !== null) &&
        nodeRoles.start === null &&
        nodeRoles.end === null &&
        edgeRoles.start === null &&
        edgeRoles.end === null;
    return timestampOnly ? "timestamp" : null;
}

/**
 * Whether a domain carries element lifetimes.
 * @param roles - the domain's role columns
 * @returns true when any temporal role column exists
 */
function hasLifetime(roles: RoleColumns): boolean {
    return (
        roles.start !== null ||
        roles.end !== null ||
        roles.timestamp !== null ||
        roles.spells !== null ||
        roles.timestamps !== null
    );
}

/**
 * Whether a column is a scalar numeric column.
 * @param column - the column
 * @returns true for f32 / f64 / i32 / u32 / u8 with one component
 */
function isNumericScalar(column: Column): boolean {
    return NUMERIC_DTYPES.has(column.dtype) && column.meta.components === 1;
}

/**
 * Whether a column is a numeric column with a given stride.
 * @param column - the column
 * @param components - the accepted strides
 * @returns true when numeric with one of the strides
 */
function isNumericVector(column: Column, components: readonly number[]): boolean {
    return NUMERIC_DTYPES.has(column.dtype) && components.includes(column.meta.components);
}

/**
 * Whether a column holds text (string or dict).
 * @param column - the column
 * @returns true for string / dict
 */
function isText(column: Column): boolean {
    return TEXT_DTYPES.has(column.dtype);
}

/**
 * Whether a column is a list of numbers with a given item stride.
 * @param column - the column
 * @param itemComponents - the required item stride
 * @returns true for a numeric list of that stride
 */
function isNumericList(column: Column, itemComponents: number): boolean {
    return (
        column.dtype === "list" &&
        column.meta.itemDtype !== null &&
        NUMERIC_DTYPES.has(column.meta.itemDtype) &&
        (column.meta.itemComponents ?? 1) === itemComponents
    );
}

/**
 * Whether a role column has the shape its GEXF field needs.
 * @param role - the role
 * @param column - the column
 * @param domain - node or edge
 * @returns true when writable
 */
function roleShapeOk(role: string, column: Column, domain: "node" | "edge"): boolean {
    switch (role) {
        case "label":
        case "shape":
            return isText(column);
        case "kind":
            return domain === "edge" && isText(column);
        case "id":
            return domain === "edge" && (isText(column) || isNumericScalar(column));
        case "start":
        case "end":
        case "timestamp":
        case "open":
            return isNumericScalar(column);
        case "size":
            return domain === "node" && isNumericScalar(column);
        case "thickness":
            return domain === "edge" && isNumericScalar(column);
        case "spells":
            return isNumericList(column, 2);
        case "spellsOpen":
            return column.dtype === "list" && column.meta.itemDtype === "u8";
        case "timestamps":
            return isNumericList(column, 1);
        case "position":
            return domain === "node" && isNumericVector(column, [2, 3]);
        case "color":
            return isNumericVector(column, [3, 4]);
        case "parent":
            return domain === "node" && column.dtype === "u32" && column.meta.components === 1;
        case "parents":
            return domain === "node" && column.dtype === "list" && column.meta.itemDtype === "u32";
        default:
            return false;
    }
}

const VIZ_NUMERIC_ROLES: ReadonlySet<string> = new Set(["position", "color", "size", "thickness"]);

const MAPPED_ROLES: ReadonlySet<string> = new Set([
    "label",
    "id",
    "kind",
    "start",
    "end",
    "timestamp",
    "spells",
    "spellsOpen",
    "timestamps",
    "open",
    "position",
    "color",
    "size",
    "shape",
    "thickness",
    "parent",
    "parents",
]);

/** The column name the importer gives each mapped role on re-import (design section 5.6 fixed names). */
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    label: NODE_COLUMNS.label,
    id: "id",
    kind: "kind",
    start: NODE_COLUMNS.start,
    end: NODE_COLUMNS.end,
    timestamp: NODE_COLUMNS.timestamp,
    spells: NODE_COLUMNS.spells,
    spellsOpen: NODE_COLUMNS.spellsOpen,
    timestamps: NODE_COLUMNS.timestamps,
    open: NODE_COLUMNS.open,
    position: NODE_COLUMNS.position,
    color: NODE_COLUMNS.color,
    size: NODE_COLUMNS.size,
    shape: NODE_COLUMNS.shape,
    thickness: "thickness",
    parent: NODE_COLUMNS.parent,
    parents: NODE_COLUMNS.parents,
});

/** ROLE_NAMES without the edge kind, which GEXF 1.2 cannot write. */
const ROLE_NAMES_1_2: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(Object.entries(ROLE_NAMES).filter(([role]) => role !== "kind")),
);

/**
 * Find the role columns of a table; a role column of the wrong shape is noted and left to the
 * attribute pass.
 * @param table - the node or edge table
 * @param domain - node or edge
 * @param note - the note recorder
 * @returns the role columns
 */
function collectRoles(
    table: Iterable<Column>,
    domain: "node" | "edge",
    note: (code: string, message: string, column?: string | null, count?: number | null) => void,
): RoleColumns {
    const companions = new Map<string, Column>();
    const roles: RoleColumns = {
        label: null,
        id: null,
        kind: null,
        start: null,
        end: null,
        timestamp: null,
        spells: null,
        spellsOpen: null,
        timestamps: null,
        open: null,
        position: null,
        color: null,
        size: null,
        shape: null,
        shapeUri: null,
        thickness: null,
        parent: null,
        parents: null,
        companions,
    };
    for (const column of table) {
        const { meta } = column;
        if (isCompanionColumn(column)) {
            const forName = meta.extra.for;
            if (typeof forName === "string") {
                companions.set(forName, column);
            }
            continue;
        }
        if (domain === "node" && meta.name === NODE_COLUMNS.shapeUri && meta.origin?.namespace === VIZ_NAMESPACE) {
            roles.shapeUri = optionalText(column);
            continue;
        }
        const { role } = meta;
        if (role === null || !MAPPED_ROLES.has(role)) {
            continue;
        }
        if (!roleShapeOk(role, column, domain)) {
            noteRoleShape(column, role, domain, note);
            continue;
        }
        noteVizDtype(column, role, domain, note);
        roles[role as keyof Omit<RoleColumns, "companions">] = column;
    }
    return roles;
}

/**
 * Whether a column is a text companion (a time text or a column naming the column it accompanies).
 * @param column - the column
 * @returns true for a string column with role timeText or an `extra.for` name
 */
function isCompanionColumn(column: Column): boolean {
    const { meta } = column;
    return (meta.role === "timeText" || typeof meta.extra.for === "string") && column.dtype === "string";
}

/**
 * Note a role column whose shape GEXF cannot map, and what writing it as an attribute loses.
 * @param column - the column
 * @param role - its role
 * @param domain - node or edge
 * @param note - the note recorder
 */
function noteRoleShape(column: Column, role: string, domain: "node" | "edge", note: NoteFn): void {
    const { meta } = column;
    note(
        GEXF_LOSS.ROLE_SHAPE,
        `${domain} column "${meta.name}" (${role}) has a shape GEXF cannot map (${describeShape(column)}); written as a plain attribute`,
        meta.name,
        null,
    );
    // the generic check skips role columns; report what the attribute path loses
    const set = column.length - column.nullCount;
    if (NUMERIC_DTYPES.has(column.dtype) && meta.components > 1) {
        note(
            LOSS.COMPONENTS,
            `${domain} column "${meta.name}" has ${meta.components} components; written as a list`,
            meta.name,
            set,
        );
    }
    if (column.dtype === "json") {
        note(LOSS.JSON, `${domain} column "${meta.name}" holds nested values; written as JSON text`, meta.name, set);
    }
    if (column.dtype === "u32" || column.dtype === "u8") {
        note(
            LOSS.DTYPE,
            `${domain} column "${meta.name}" is ${column.dtype}; the format cannot keep that dtype`,
            meta.name,
            set,
        );
    }
}

/**
 * Note a viz role column whose dtype the importer does not read back.
 * @param column - the column
 * @param role - its role
 * @param domain - node or edge
 * @param note - the note recorder
 */
function noteVizDtype(column: Column, role: string, domain: "node" | "edge", note: NoteFn): void {
    // the importer reads a position as f64 and every other viz value as f32
    const vizDtype = role === "position" ? "f64" : "f32";
    if (VIZ_NUMERIC_ROLES.has(role) && column.dtype !== vizDtype) {
        note(
            GEXF_LOSS.VIZ_DTYPE,
            `${domain} column "${column.meta.name}" (${role}) is ${column.dtype}; viz values read back as ${vizDtype}`,
            column.meta.name,
            column.length - column.nullCount,
        );
    }
}

/**
 * A short description of a column's shape for messages.
 * @param column - the column
 * @returns "dtype x components" or "list of item"
 */
function describeShape(column: Column): string {
    if (column.dtype === "list") {
        return `list of ${column.meta.itemDtype ?? "?"} x ${column.meta.itemComponents ?? 1}`;
    }
    return `${column.dtype} x ${column.meta.components}`;
}

/**
 * Resolve every temporal extension table (design section 5.10) into its columns, grouped by
 * domain and keyed by the static column's name; a table without the required columns is noted.
 * @param snapshot - the snapshot
 * @param version - the target version
 * @param note - the note recorder
 * @returns tables by domain, then by column name
 */
function collectTemporalTables(
    snapshot: GraphSnapshot,
    version: GexfVersion,
    note: (code: string, message: string, column?: string | null, count?: number | null) => void,
): Map<"node" | "edge", Map<string, TemporalTable>> {
    const out = new Map<"node" | "edge", Map<string, TemporalTable>>();
    for (const [name, table] of snapshot.extensions) {
        const parsed = parseTemporalTableName(name);
        if (parsed === null) {
            continue;
        }
        const resolved = resolveTemporalTable(name, table, version, note);
        if (resolved === null) {
            continue;
        }
        let byDomain = out.get(parsed.domain);
        if (byDomain === undefined) {
            byDomain = new Map();
            out.set(parsed.domain, byDomain);
        }
        byDomain.set(parsed.column, resolved);
    }
    return out;
}

/**
 * Resolve one temporal extension table into its columns; a table without the required columns is
 * noted, and open intervals a 1.3 export cannot write are noted.
 * @param name - the table name
 * @param table - the table
 * @param version - the target version
 * @param note - the note recorder
 * @returns the resolved table, or null when it cannot be written
 */
function resolveTemporalTable(
    name: string,
    table: AttributeTable,
    version: GexfVersion,
    note: NoteFn,
): TemporalTable | null {
    const element = table.get(TEMPORAL_COLUMNS.element);
    const start = table.get(TEMPORAL_COLUMNS.start);
    const end = table.get(TEMPORAL_COLUMNS.end);
    const value = table.get(TEMPORAL_COLUMNS.value);
    if (
        element?.dtype !== "u32" ||
        start === null ||
        !isNumericScalar(start) ||
        end === null ||
        !isNumericScalar(end) ||
        value === null
    ) {
        note(
            GEXF_LOSS.TEMPORAL_TABLE_SHAPE,
            `extension table "${name}" lacks the element / start / end / value columns and cannot be written`,
            name,
            table.rowCount,
        );
        return null;
    }
    const rows = groupRowsByElement(element, table.rowCount);
    const typed = attributeType(value, version);
    const open = optionalNumeric(table.get(TEMPORAL_COLUMNS.open));
    if (version === "1.3" && open !== null && open.length - open.nullCount > 0) {
        note(
            LOSS.OPEN_INTERVAL,
            `dynamic values of "${name}" carry open intervals, which GEXF 1.3 cannot write`,
            name,
            open.length - open.nullCount,
        );
    }
    return {
        element,
        start,
        end,
        value,
        startText: optionalText(table.get(TEMPORAL_COLUMNS.startText)),
        endText: optionalText(table.get(TEMPORAL_COLUMNS.endText)),
        valueText: isTemporalType(typed.type) ? optionalText(table.get(TEMPORAL_COLUMNS.valueText)) : null,
        open,
        rows,
        format: typed.format,
    };
}

/**
 * The rows of a temporal table grouped by the element they belong to.
 * @param element - the element column
 * @param rowCount - the table's row count
 * @returns the row indices by element index, in row order
 */
function groupRowsByElement(element: Column, rowCount: number): Map<number, number[]> {
    const rows = new Map<number, number[]>();
    for (let r = 0; r < rowCount; r++) {
        if (!element.isSet(r)) {
            continue;
        }
        const e = element.value(r) as number;
        const list = rows.get(e);
        if (list === undefined) {
            rows.set(e, [r]);
        } else {
            list.push(r);
        }
    }
    return rows;
}

/**
 * A string column, or null.
 * @param column - the column or null
 * @returns the column when it is a string column
 */
function optionalText(column: Column | null): Column | null {
    return column !== null && column.dtype === "string" ? column : null;
}

/**
 * A numeric scalar column, or null.
 * @param column - the column or null
 * @returns the column when numeric
 */
function optionalNumeric(column: Column | null): Column | null {
    return column !== null && isNumericScalar(column) ? column : null;
}

/**
 * The GEXF type of a column and the formatter of its values: the declared `origin.type` when the
 * version knows it and it agrees with the dtype, the canonical type of the dtype otherwise; lists
 * become `list<item>` (1.3) or `liststring` (1.2); a stride column becomes a list of its lanes;
 * json becomes a string of JSON text.
 * @param column - the column
 * @param version - the target version
 * @returns the type text, whether it is a list, and the formatter
 */
function attributeType(column: Column, version: GexfVersion): TypedAttribute {
    const { meta } = column;
    const originType = meta.origin?.type ?? null;
    if (meta.dtype === "list" || (NUMERIC_DTYPES.has(meta.dtype) && meta.components > 1)) {
        return listAttributeType(column, originType, version);
    }
    return scalarAttributeType(column, originType, version);
}

/**
 * The GEXF type of a list or stride column (see attributeType).
 * @param column - the column
 * @param originType - the declared origin type, or null
 * @param version - the target version
 * @returns the typed attribute
 */
function listAttributeType(column: Column, originType: string | null, version: GexfVersion): TypedAttribute {
    const { meta } = column;
    const itemDtype = meta.dtype === "list" ? (meta.itemDtype ?? "string") : meta.dtype;
    let itemType = canonicalScalarType(itemDtype);
    if (
        originType !== null &&
        meta.dtype === "list" &&
        isListType(originType, "1.3") &&
        agrees(originType, "list", itemDtype)
    ) {
        itemType = originType.slice(4);
    }
    if (version === "1.2") {
        const itemFormat = scalarFormatter(itemType, itemDtype);
        return {
            type: "liststring",
            list: true,
            itemType: "string",
            format: listFormatter(itemFormat, version),
            dropped: itemType === "string" ? null : `list${itemType}`,
        };
    }
    return {
        type: `list${itemType}`,
        list: true,
        itemType,
        format: listFormatter(scalarFormatter(itemType, itemDtype), version),
        dropped: null,
    };
}

/**
 * The GEXF type of a scalar column (see attributeType).
 * @param column - the column
 * @param originType - the declared origin type, or null
 * @param version - the target version
 * @returns the typed attribute
 */
function scalarAttributeType(column: Column, originType: string | null, version: GexfVersion): TypedAttribute {
    const { meta } = column;
    let type = canonicalScalarType(meta.dtype);
    let dropped: string | null = null;
    const temporal = originType === null || meta.dtype !== "f64" ? null : gexfTemporalType(originType);
    if (temporal !== null) {
        // a date / dateTime column of any format (Neo4j spells them date / datetime /
        // localdatetime) keeps its temporal type, so the text companion is written back
        if (isScalarType(temporal, version)) {
            type = temporal;
        } else {
            dropped = temporal;
        }
    } else if (originType !== null && agrees(originType, meta.dtype, null)) {
        if (isScalarType(originType, version)) {
            type = originType;
        } else if (isScalarType(originType, "1.3")) {
            dropped = originType;
        }
    }
    return { type, list: false, itemType: type, format: scalarFormatter(type, meta.dtype), dropped };
}

/**
 * The GEXF temporal type a declared origin type of any format maps to: `date` for a date,
 * `dateTime` for a date-time with or without zone (GEXF's own spellings, Neo4j's `date` /
 * `datetime` / `localdatetime`), null for a non-temporal type or a time of day (GEXF has none).
 * @param originType - the declared type text
 * @returns "date", "dateTime" or null
 */
function gexfTemporalType(originType: string): "date" | "dateTime" | null {
    switch (originType.toLowerCase()) {
        case "date":
            return "date";
        case "datetime":
        case "localdatetime":
            return "dateTime";
        default:
            return null;
    }
}

/**
 * Whether a declared GEXF type maps back to a dtype (so the exporter may restore it verbatim).
 * @param type - the declared type text
 * @param dtype - the column dtype
 * @param itemDtype - the item dtype of a list column, or null
 * @returns true when mapDeclaredType agrees
 */
function agrees(type: string, dtype: string, itemDtype: string | null): boolean {
    const spec = mapDeclaredType("gexf", type, "f64");
    if (spec === null) {
        return false;
    }
    if (dtype === "list") {
        return spec.list && spec.itemDtype === itemDtype;
    }
    if (spec.list) {
        return false;
    }
    // a dict column is a string column with options
    return spec.dtype === dtype || (dtype === "dict" && spec.dtype === "string");
}

/**
 * The formatter of one scalar value under a GEXF type.
 * @param type - the GEXF scalar type text
 * @param dtype - the column (or item) dtype the values come from
 * @returns the formatter
 */
function scalarFormatter(type: string, dtype: string): ValueFormatter {
    switch (type) {
        case "boolean":
            return (value): string | null => {
                if (typeof value === "boolean") {
                    return value ? "true" : "false";
                }
                if (typeof value !== "number") {
                    return null;
                }
                return value !== 0 ? "true" : "false";
            };
        case "integer":
        case "long":
        case "byte":
        case "short":
        case "biginteger":
            return (value): string | null => {
                if (typeof value === "number") {
                    return Number.isInteger(value) ? formatInteger(value) : formatF64(value);
                }
                return typeof value === "string" ? value : null;
            };
        case "float":
            return (value): string | null => (typeof value === "number" ? formatF32(value) : null);
        case "double":
        case "bigdecimal":
            return (value): string | null => {
                if (typeof value === "number") {
                    return dtype === "f32" ? formatF32(value) : formatF64(value);
                }
                return typeof value === "string" ? value : null;
            };
        case "date":
        case "dateTime":
            return (value): string | null => {
                if (typeof value === "number") {
                    return formatTemporal(value, type);
                }
                return typeof value === "string" ? value : null;
            };
        default:
            return (value): string | null => {
                switch (typeof value) {
                    case "string":
                        return value;
                    case "number":
                        return dtype === "f32" ? formatF32(value) : formatF64(value);
                    case "boolean":
                        return value ? "true" : "false";
                    case "object":
                        return value === null ? null : JSON.stringify(value);
                    default:
                        return null;
                }
            };
    }
}

/**
 * The formatter of a list value: items through the item formatter, joined per version.
 * @param item - the item formatter
 * @param version - the target version (1.3 brackets, 1.2 pipes)
 * @returns the formatter; null when any item cannot be written
 */
function listFormatter(item: ValueFormatter, version: GexfVersion): ValueFormatter {
    return (value): string | null => {
        if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
            return null;
        }
        const items: string[] = [];
        for (const entry of Array.from(value as ArrayLike<unknown>)) {
            const text = item(entry);
            if (text === null) {
                return null;
            }
            items.push(text);
        }
        return joinListText(items, version === "1.2" ? "pipe" : "gexf");
    };
}

/**
 * Decide the `<attribute>` declarations of a domain: every column that is neither structural, a
 * companion nor a mapped role column, in declaration order, plus the temporal tables without a
 * static column (the dynamic weight) as dynamic attributes.
 * @param snapshot - the snapshot
 * @param domain - node or edge
 * @param roles - the domain's role columns
 * @param tables - the domain's temporal tables by column name
 * @param version - the target version
 * @param note - the note recorder
 * @returns the declarations
 */
function collectAttributes(
    snapshot: GraphSnapshot,
    domain: "node" | "edge",
    roles: RoleColumns,
    tables: ReadonlyMap<string, TemporalTable>,
    version: GexfVersion,
    note: (code: string, message: string, column?: string | null, count?: number | null) => void,
): AttributeSpec[] {
    const table = domain === "node" ? snapshot.nodes : snapshot.edges;
    const ctx: DeclareContext = {
        domain,
        version,
        note,
        roles,
        reserved: domain === "node" ? RESERVED_NODE_NAMES : RESERVED_EDGE_NAMES,
        usedIds: new Set<string>(),
        specs: [],
    };
    const roleColumns = roleColumnSet(roles);
    const usedTables = new Set<string>();
    for (const column of table) {
        if (!isAttributeColumn(column, roleColumns, roles, domain)) {
            continue;
        }
        const { meta } = column;
        const temporal = tables.get(meta.name) ?? null;
        if (temporal !== null) {
            usedTables.add(meta.name);
        }
        declareAttributeSpec(ctx, {
            column,
            name: meta.name,
            origin: { id: meta.origin?.id ?? null, title: meta.origin?.title ?? null },
            typed: attributeType(column, version),
            dynamic: meta.dynamic || temporal !== null,
            temporal,
        });
    }
    for (const [name, temporal] of tables) {
        if (usedTables.has(name)) {
            continue;
        }
        const { origin } = temporal.value.meta;
        declareAttributeSpec(ctx, {
            column: null,
            name,
            origin: { id: origin?.id ?? weightIdFor(snapshot, domain, name), title: null },
            typed: attributeType(temporal.value, version),
            dynamic: true,
            temporal,
        });
    }
    return ctx.specs;
}

/** The shared state of one domain's attribute declarations. */
interface DeclareContext {
    readonly domain: "node" | "edge";
    readonly version: GexfVersion;
    readonly note: NoteFn;
    readonly roles: RoleColumns;
    readonly reserved: ReadonlySet<string>;
    readonly usedIds: Set<string>;
    readonly specs: AttributeSpec[];
}

/** One attribute to declare. */
interface DeclareEntry {
    readonly column: Column | null;
    readonly name: string;
    readonly origin: { id: string | null; title: string | null };
    readonly typed: TypedAttribute;
    readonly dynamic: boolean;
    readonly temporal: TemporalTable | null;
}

/**
 * The mapped role columns of a domain, as a set.
 * @param roles - the domain's role columns
 * @returns every non-null role column (companions excluded)
 */
function roleColumnSet(roles: RoleColumns): Set<Column> {
    const roleColumns = new Set<Column>();
    const { companions: _companions, ...columns } = roles;
    for (const value of Object.values(columns)) {
        if (value !== null) {
            roleColumns.add(value);
        }
    }
    return roleColumns;
}

/**
 * Whether a column is written as an `<attribute>`: not a role, structural, companion or shape uri
 * column.
 * @param column - the column
 * @param roleColumns - the domain's role columns
 * @param roles - the domain's role columns by role
 * @param domain - node or edge
 * @returns true when the column is declared as an attribute
 */
function isAttributeColumn(
    column: Column,
    roleColumns: ReadonlySet<Column>,
    roles: RoleColumns,
    domain: "node" | "edge",
): boolean {
    const { meta } = column;
    if (roleColumns.has(column) || (meta.role !== null && STRUCTURAL_ROLES.has(meta.role))) {
        return false;
    }
    if (typeof meta.extra.for === "string" && column.dtype === "string") {
        return false;
    }
    return !(domain === "node" && column === roles.shapeUri);
}

/**
 * The weight attribute id a dynamic edge weight table takes from the snapshot's weight origin.
 * @param snapshot - the snapshot
 * @param domain - node or edge
 * @param name - the table's column name
 * @returns the origin id, or null
 */
function weightIdFor(snapshot: GraphSnapshot, domain: "node" | "edge", name: string): string | null {
    const { weightOrigin } = snapshot.meta;
    return domain === "edge" && weightOrigin !== null && (weightOrigin.title ?? weightOrigin.id) === name
        ? weightOrigin.id
        : null;
}

/**
 * Declare one attribute: pick its id and title, note what re-import changes, and record its spec.
 * @param ctx - the domain's declaration state
 * @param entry - the attribute to declare
 */
function declareAttributeSpec(ctx: DeclareContext, entry: DeclareEntry): void {
    const { domain, version, note, roles } = ctx;
    const { column, name, origin, typed } = entry;
    const id = uniqueId(origin.id ?? name, name, ctx.usedIds);
    const title = origin.title ?? name;
    noteDeclaredName(ctx, entry, id, title);
    const { defaultText, optionsText } =
        column === null
            ? { defaultText: null, optionsText: null }
            : declaredTexts(column, domain, typed, version, note);
    const companion = column === null ? null : (roles.companions.get(name) ?? null);
    const temporalType = isTemporalType(typed.type);
    if (companion !== null && !temporalType) {
        note(
            LOSS.TEMPORAL_TEXT,
            `${domain} column "${companion.meta.name}" (the lexical form of "${name}") cannot be written: "${name}" is written as ${typed.type}, not a GEXF temporal type`,
            companion.meta.name,
            companion.length - companion.nullCount,
        );
    }
    ctx.specs.push({
        id,
        title,
        type: typed.type,
        column,
        companion: temporalType ? companion : null,
        format: typed.format,
        defaultText,
        optionsText,
        dynamic: entry.dynamic,
        table: entry.temporal,
    });
}

/**
 * Note a dropped declared type, a title the importer reads as the weight, and a renamed title.
 * @param ctx - the domain's declaration state
 * @param entry - the attribute being declared
 * @param id - its attribute id
 * @param title - its title
 */
function noteDeclaredName(ctx: DeclareContext, entry: DeclareEntry, id: string, title: string): void {
    const { domain, version, note } = ctx;
    const { column, name, typed } = entry;
    if (typed.dropped !== null) {
        note(
            GEXF_LOSS.DECLARED_TYPE,
            `${domain} column "${name}" is declared ${typed.dropped}, which GEXF ${version} lacks; written as ${typed.type}`,
            name,
            null,
        );
    }
    if (domain === "edge" && column !== null && column.meta.role === null && title === DEFAULT_WEIGHT_TITLE) {
        note(
            GEXF_LOSS.WEIGHT_KEY_CLASH,
            `edge column "${name}" is written as an attribute titled "${title}", which the importer reads as the edge weight (weightFrom); it reads back as the weight, not as a column`,
            name,
            column.length - column.nullCount,
        );
    }
    const reimportName = ctx.reserved.has(title) ? `${title}#${id}` : title;
    if (reimportName !== name) {
        note(
            GEXF_LOSS.ATTRIBUTE_RENAMED,
            `${domain} column "${name}" is written with title "${title}" and reads back as "${reimportName}"`,
            name,
            null,
        );
    }
}

/**
 * The `<default>` and `<options>` texts of a declared attribute, with the notes about what cannot
 * be written as the declared type, about a dictionary written as options, and about 1.2 list items
 * holding the `|` separator.
 * @param column - the column
 * @param domain - node or edge
 * @param typed - the attribute's GEXF type and formatter
 * @param version - the target version
 * @param note - the note recorder
 * @returns the default and options texts (null when absent or unwritable)
 */
function declaredTexts(
    column: Column,
    domain: "node" | "edge",
    typed: TypedAttribute,
    version: GexfVersion,
    note: (code: string, message: string, column?: string | null, count?: number | null) => void,
): { defaultText: string | null; optionsText: string | null } {
    const defaultText = declaredDefaultText(column, domain, typed, note);
    const optionsText = declaredOptionsText(column, domain, typed, version, note);
    if (version === "1.2" && column.dtype === "list") {
        noteListSeparator(column, domain, note);
    }
    return { defaultText, optionsText };
}

/**
 * The `<default>` text of a declared attribute; an unwritable default is noted.
 * @param column - the column
 * @param domain - node or edge
 * @param typed - the attribute's GEXF type and formatter
 * @param note - the note recorder
 * @returns the text, or null when absent or unwritable
 */
function declaredDefaultText(
    column: Column,
    domain: "node" | "edge",
    typed: TypedAttribute,
    note: NoteFn,
): string | null {
    const { meta } = column;
    if (meta.default === undefined) {
        return null;
    }
    const defaultText = typed.format(meta.default);
    if (defaultText === null) {
        note(
            GEXF_LOSS.VALUE_UNWRITABLE,
            `${domain} column "${meta.name}": the default cannot be written as ${typed.type}`,
            meta.name,
            null,
        );
    }
    return defaultText;
}

/**
 * The `<options>` text of a declared attribute (its options, or a dict column's dictionary); a
 * dictionary written as options and unwritable options are noted.
 * @param column - the column
 * @param domain - node or edge
 * @param typed - the attribute's GEXF type and formatter
 * @param version - the target version
 * @param note - the note recorder
 * @returns the text, or null when absent or unwritable
 */
function declaredOptionsText(
    column: Column,
    domain: "node" | "edge",
    typed: TypedAttribute,
    version: GexfVersion,
    note: NoteFn,
): string | null {
    const { meta } = column;
    const { name } = meta;
    const options = meta.options ?? (column.dtype === "dict" ? column.dictionary : null);
    if (meta.options === null && options !== null && options.length > 0) {
        note(
            GEXF_LOSS.OPTIONS_GAINED,
            `${domain} column "${name}" declares no options; its dictionary is written as <options> and reads back as declared options`,
            name,
            null,
        );
    }
    if (options === null) {
        return null;
    }
    const itemFormat = typed.list ? scalarFormatter(typed.itemType, meta.itemDtype ?? "string") : typed.format;
    const texts: string[] = [];
    for (const option of options) {
        const text = itemFormat(option);
        if (text === null) {
            note(
                GEXF_LOSS.VALUE_UNWRITABLE,
                `${domain} column "${name}": the options cannot be written as ${typed.type}`,
                name,
                null,
            );
            return null;
        }
        texts.push(text);
    }
    return joinListText(texts, version === "1.2" ? "pipe" : "gexf");
}

/**
 * Note the rows of a 1.2 list column holding an item that contains the `|` separator.
 * @param column - the list column
 * @param domain - node or edge
 * @param note - the note recorder
 */
function noteListSeparator(column: Column, domain: "node" | "edge", note: NoteFn): void {
    const { name } = column.meta;
    let count = 0;
    for (let r = 0; r < column.length; r++) {
        if (column.isSet(r) && listItems(column, r).some((item) => String(item).includes("|"))) {
            count++;
        }
    }
    if (count > 0) {
        note(
            GEXF_LOSS.LIST_SEPARATOR,
            `${domain} column "${name}": ${count} row${plural(count)} ${agree(count, "holds", "hold")} an item containing "|", the 1.2 list separator`,
            name,
            count,
        );
    }
}

/**
 * Whether a GEXF type is a temporal one whose values have text companions.
 * @param type - the type text
 * @returns true for date / dateTime
 */
function isTemporalType(type: string): boolean {
    return type === "date" || type === "dateTime";
}

/**
 * A unique attribute id within a class.
 * @param preferred - the id to try first (the origin id or the name)
 * @param name - the column name, tried second
 * @param used - ids already taken
 * @returns a free id, recorded as used
 */
function uniqueId(preferred: string, name: string, used: Set<string>): string {
    const candidates = [preferred, name];
    for (const candidate of candidates) {
        if (candidate.length > 0 && !used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
    for (let n = 2; ; n++) {
        const candidate = `${name}#${n}`;
        if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
}

// ============================================================ writing

/**
 * The text of a time bound: the companion text when present, the formatted number otherwise.
 * @param column - the numeric column
 * @param companion - its text companion, or null
 * @param row - the row
 * @param timeFormat - the graph's timeformat
 * @returns the text
 */
function timeText(column: Column, companion: Column | null, row: number, timeFormat: TimeFormat | null): string {
    if (companion?.isSet(row)) {
        return companion.value(row) as string;
    }
    return formatTimeValue(column.value(row) as number, timeFormat);
}

/**
 * The `start` / `end` / `timestamp` / open attributes of one element.
 * @param roles - the domain's role columns
 * @param row - the element's row
 * @param plan - the plan
 * @returns the attribute text, starting with a space when non-empty
 */
function lifetimeAttrs(roles: RoleColumns, row: number, plan: ExportPlan): string {
    let out = "";
    const { timeFormat, version } = plan;
    let bits = 0;
    if (version === "1.2" && roles.open?.isSet(row)) {
        bits = roles.open.value(row) as number;
    }
    const write = (name: string, column: Column | null, open: boolean): void => {
        if (!column?.isSet(row)) {
            return;
        }
        const value = column.value(row) as number;
        if (!Number.isFinite(value)) {
            return;
        }
        const text = timeText(column, roles.companions.get(column.meta.name) ?? null, row, timeFormat);
        // GEXF 1.2: `startopen` / `endopen` hold the time of a non-inclusive bound (dynamics.xsd
        // time-type) and replace `start` / `end`
        const attribute = open ? `${name}open` : name;
        out += ` ${attribute}="${escapeXmlAttribute(text)}"`;
    };
    if (roles.timestamp?.isSet(row)) {
        if (version === "1.3" && plan.timeRepresentation === "timestamp") {
            write("timestamp", roles.timestamp, false);
        } else {
            write("start", roles.timestamp, false);
            write("end", roles.timestamp, false);
        }
    } else {
        write("start", roles.start, (bits & OPEN_START) !== 0);
        write("end", roles.end, (bits & OPEN_END) !== 0);
    }
    if (version === "1.3" && roles.timestamps?.isSet(row)) {
        const items = listItems(roles.timestamps, row).map((t) => formatTimeValue(t as number, timeFormat));
        const stamps = `<[${items.join(", ")}]>`;
        out += ` timestamps="${escapeXmlAttribute(stamps)}"`;
    }
    return out;
}

/**
 * The `start` and `end` attributes of one `<spell>`.
 * @param s - the start, or a non-finite value for an unbounded start
 * @param e - the end, or a non-finite value for an unbounded end
 * @param open - the open-bound bits
 * @param plan - the plan
 * @returns the attribute text, each with a leading space
 */
function spellBounds(s: number, e: number, open: number, plan: ExportPlan): string {
    let attrs = "";
    if (Number.isFinite(s)) {
        const name = (open & OPEN_START) === 0 ? "start" : "startopen";
        attrs += ` ${name}="${escapeXmlAttribute(formatTimeValue(s, plan.timeFormat))}"`;
    }
    if (Number.isFinite(e)) {
        const name = (open & OPEN_END) === 0 ? "end" : "endopen";
        attrs += ` ${name}="${escapeXmlAttribute(formatTimeValue(e, plan.timeFormat))}"`;
    }
    return attrs;
}

/**
 * The `<spells>` element of one element: its spells column, plus (1.2) its timestamps as [t, t].
 * In 1.2 a spell whose spells.open bits mark a bound open writes that bound as `startopen` /
 * `endopen`; 1.3 has no open bounds, and check() reports the loss.
 * @param roles - the domain's role columns
 * @param row - the element's row
 * @param plan - the plan
 * @param indent - the indentation of the element
 * @returns the lines, or an empty string
 */
function spellsElement(roles: RoleColumns, row: number, plan: ExportPlan, indent: string): string {
    const pairs: (readonly [number, number, number])[] = [];
    if (roles.spells?.isSet(row)) {
        const open = plan.version === "1.2" && roles.spellsOpen?.isSet(row) ? listItems(roles.spellsOpen, row) : [];
        listItems(roles.spells, row).forEach((pair, i) => {
            const [s, e] = Array.from(pair as ArrayLike<number>);
            pairs.push([s, e, (open[i] as number | undefined) ?? 0]);
        });
    }
    if (plan.version === "1.2" && roles.timestamps?.isSet(row)) {
        for (const t of listItems(roles.timestamps, row)) {
            pairs.push([t as number, t as number, 0]);
        }
    }
    if (pairs.length === 0) {
        return "";
    }
    let out = `${indent}<spells>\n`;
    for (const [s, e, open] of pairs) {
        out += `${indent}  <spell${spellBounds(s, e, open, plan)}/>\n`;
    }
    return `${out}${indent}</spells>\n`;
}

/**
 * The `<attvalues>` element of one node or edge: static cells and dynamic rows.
 * @param attrs - the domain's declarations
 * @param row - the element's row
 * @param plan - the plan
 * @param indent - the indentation of the element
 * @returns the lines, or an empty string
 */
function attvaluesElement(attrs: readonly AttributeSpec[], row: number, plan: ExportPlan, indent: string): string {
    let out = "";
    for (const spec of attrs) {
        out += staticAttvalue(spec, row, indent);
        out += dynamicAttvalues(spec, row, plan, indent);
    }
    return out.length === 0 ? "" : `${indent}<attvalues>\n${out}${indent}</attvalues>\n`;
}

/**
 * The static `<attvalue>` line of one attribute of one element.
 * @param spec - the declaration
 * @param row - the element's row
 * @param indent - the indentation of the element
 * @returns the line, or an empty string when unset or unwritable
 */
function staticAttvalue(spec: AttributeSpec, row: number, indent: string): string {
    const { column } = spec;
    if (!column?.isSet(row)) {
        return "";
    }
    let text: string | null;
    if (spec.companion?.isSet(row)) {
        text = spec.companion.value(row) as string;
    } else {
        text = spec.format(cellValue(column, row));
    }
    if (text === null) {
        return "";
    }
    return `${indent}  <attvalue for="${escapeXmlAttribute(spec.id)}" value="${escapeXmlAttribute(text)}"/>\n`;
}

/**
 * The timed `<attvalue>` lines of one attribute of one element, from its temporal table.
 * @param spec - the declaration
 * @param row - the element's row
 * @param plan - the plan
 * @param indent - the indentation of the element
 * @returns the lines, or an empty string
 */
function dynamicAttvalues(spec: AttributeSpec, row: number, plan: ExportPlan, indent: string): string {
    const { table } = spec;
    const rows = table?.rows.get(row);
    if (table === null || rows === undefined) {
        return "";
    }
    let out = "";
    for (const r of rows) {
        if (!table.value.isSet(r)) {
            continue;
        }
        let text: string | null;
        if (table.valueText?.isSet(r)) {
            text = table.valueText.value(r) as string;
        } else {
            text = table.format(cellValue(table.value, r));
        }
        if (text === null) {
            continue;
        }
        out += `${indent}  <attvalue for="${escapeXmlAttribute(spec.id)}" value="${escapeXmlAttribute(text)}"${timedAttrs(table, r, plan)}/>\n`;
    }
    return out;
}

/**
 * The time bounds of one temporal table row as attributes.
 * @param table - the table
 * @param r - the row
 * @param plan - the plan
 * @returns the attribute text, starting with a space when non-empty
 */
function timedAttrs(table: TemporalTable, r: number, plan: ExportPlan): string {
    const start = table.start.isSet(r) ? (table.start.value(r) as number) : -Infinity;
    const end = table.end.isSet(r) ? (table.end.value(r) as number) : Infinity;
    let out = "";
    if (plan.version === "1.3" && plan.timeRepresentation === "timestamp" && start === end && Number.isFinite(start)) {
        return ` timestamp="${escapeXmlAttribute(timeText(table.start, table.startText, r, plan.timeFormat))}"`;
    }
    let bits = 0;
    if (plan.version === "1.2" && table.open?.isSet(r)) {
        bits = table.open.value(r) as number;
    }
    if (Number.isFinite(start)) {
        const name = (bits & OPEN_START) !== 0 ? "startopen" : "start";
        out += ` ${name}="${escapeXmlAttribute(timeText(table.start, table.startText, r, plan.timeFormat))}"`;
    }
    if (Number.isFinite(end)) {
        const name = (bits & OPEN_END) !== 0 ? "endopen" : "end";
        out += ` ${name}="${escapeXmlAttribute(timeText(table.end, table.endText, r, plan.timeFormat))}"`;
    }
    return out;
}

/**
 * The value of a set cell as a plain JS value: lists through sliceOf, json through values, a
 * stride column as an array of lanes.
 * @param column - the column
 * @param row - the row
 * @returns the value
 */
function cellValue(column: Column, row: number): unknown {
    switch (column.dtype) {
        case "list":
            return column.sliceOf(row);
        case "json":
            return column.values[row];
        default: {
            const value = column.value(row);
            return ArrayBuffer.isView(value) ? Array.from(value as ArrayLike<number>) : value;
        }
    }
}

/**
 * Whether `viz:position` gets a z attribute: always for a 3-d source, and for a 2-d source
 * (`extra.sourceDims === 2`) only when some node has since been given a non-zero z.
 * @param position - the position role column, or null
 * @returns true when z is written
 */
function positionWritesZ(position: Column | null): boolean {
    if (position === null || position.meta.components < 3) {
        return false;
    }
    if (position.meta.extra.sourceDims !== 2) {
        return true;
    }
    const { components } = position.meta;
    let data: ArrayLike<number>;
    switch (position.dtype) {
        case "f32":
        case "f64":
        case "i32":
        case "u32":
        case "u8":
            ({ data } = position);
            break;
        default:
            // A non-numeric position column has no z lane to inspect; write z so nothing is lost.
            return true;
    }
    for (let i = 0; i < position.length; i++) {
        if (position.isSet(i) && data[i * components + 2] !== 0) {
            return true;
        }
    }
    return false;
}

/**
 * The items of a set row of a list column.
 * @param column - a list column
 * @param row - the row
 * @returns the items; empty when the column is not a list
 */
function listItems(column: Column, row: number): readonly unknown[] {
    return column.dtype === "list" ? column.sliceOf(row) : [];
}

/**
 * The viz elements of one node or edge.
 *
 * Deprecated path, unchanged until the next major version: without `styles`, the color, size,
 * shape and thickness role columns are written into `viz:*`. With `styles`, gexfStyledExport()
 * replaces those columns with what the graph draws, so the style writer is the only path.
 * @param roles - the domain's role columns
 * @param row - the element's row
 * @param indent - the indentation
 * @param writeZ - whether viz:position gets its z attribute
 * @returns the lines, or an empty string
 */
function vizElements(roles: RoleColumns, row: number, indent: string, writeZ: boolean): string {
    let out = vizColor(roles.color, row, indent);
    out += vizPosition(roles.position, row, indent, writeZ);
    for (const [name, column] of [
        ["size", roles.size],
        ["thickness", roles.thickness],
    ] as const) {
        if (column?.isSet(row)) {
            const value = column.value(row) as number;
            const text = column.dtype === "f32" ? formatF32(value) : formatF64(value);
            out += `${indent}<viz:${name} value="${escapeXmlAttribute(text)}"/>\n`;
        }
    }
    const { shape } = roles;
    if (shape?.isSet(row)) {
        let attrs = ` value="${escapeXmlAttribute(String(shape.value(row)))}"`;
        if (roles.shapeUri?.isSet(row)) {
            attrs += ` uri="${escapeXmlAttribute(roles.shapeUri.value(row) as string)}"`;
        }
        out += `${indent}<viz:shape${attrs}/>\n`;
    }
    return out;
}

/**
 * The `<viz:color>` element of one node or edge.
 * @param color - the color role column, or null
 * @param row - the element's row
 * @param indent - the indentation
 * @returns the line, or an empty string
 */
function vizColor(color: Column | null, row: number, indent: string): string {
    if (!color?.isSet(row)) {
        return "";
    }
    const lanes = Array.from(color.value(row) as ArrayLike<number>);
    const scale = color.dtype === "u8" ? 1 : 255;
    const channel = (v: number): string => String(Math.max(0, Math.min(255, Math.round(v * scale))));
    let attrs = ` r="${channel(lanes[0])}" g="${channel(lanes[1])}" b="${channel(lanes[2])}"`;
    if (lanes.length > 3) {
        const a = color.dtype === "u8" ? lanes[3] / 255 : lanes[3];
        if (a !== 1) {
            attrs += ` a="${formatF32(Math.fround(a))}"`;
        }
    }
    return `${indent}<viz:color${attrs}/>\n`;
}

/**
 * The `<viz:position>` element of one node or edge.
 * @param position - the position role column, or null
 * @param row - the element's row
 * @param indent - the indentation
 * @param writeZ - whether the z attribute is written
 * @returns the line, or an empty string
 */
function vizPosition(position: Column | null, row: number, indent: string, writeZ: boolean): string {
    if (!position?.isSet(row)) {
        return "";
    }
    const lanes = Array.from(position.value(row) as ArrayLike<number>);
    const fmt = position.dtype === "f32" ? formatF32 : formatF64;
    let attrs = ` x="${fmt(lanes[0])}" y="${fmt(lanes[1])}"`;
    if (lanes.length > 2 && writeZ) {
        attrs += ` z="${fmt(lanes[2])}"`;
    }
    return `${indent}<viz:position${attrs}/>\n`;
}

/**
 * The `<attributes>` groups of one class.
 * @param cls - node or edge
 * @param specs - the declarations
 * @param indent - the indentation
 * @returns the lines, or an empty string
 */
function attributesGroups(cls: "node" | "edge", specs: readonly AttributeSpec[], indent: string): string {
    let out = "";
    for (const mode of ["static", "dynamic"] as const) {
        const group = specs.filter((s) => s.dynamic === (mode === "dynamic"));
        if (group.length === 0) {
            continue;
        }
        out += `${indent}<attributes class="${cls}" mode="${mode}">\n`;
        for (const spec of group) {
            const head = `${indent}  <attribute id="${escapeXmlAttribute(spec.id)}" title="${escapeXmlAttribute(spec.title)}" type="${spec.type}"`;
            if (spec.defaultText === null && spec.optionsText === null) {
                out += `${head}/>\n`;
                continue;
            }
            out += `${head}>\n`;
            if (spec.defaultText !== null) {
                out += `${indent}    <default>${escapeXmlText(spec.defaultText)}</default>\n`;
            }
            if (spec.optionsText !== null) {
                out += `${indent}    <options>${escapeXmlText(spec.optionsText)}</options>\n`;
            }
            out += `${indent}  </attribute>\n`;
        }
        out += `${indent}</attributes>\n`;
    }
    return out;
}

/**
 * The `type` of a logical edge after folding an expanded pair (design section 3.6).
 * @param snapshot - the snapshot
 * @param e - the logical edge index
 * @param folding - the pair-folding view (mutual pairs fold: GEXF has the mutual type)
 * @returns the edge type, or null when the edge is the mirror half of a pair
 */
function edgeType(snapshot: GraphSnapshot, e: number, folding: PairFolding): GexfEdgeType | null {
    if (!snapshot.directed) {
        return "undirected";
    }
    if (folding.folded(e)) {
        return null;
    }
    if (!folding.sourceDirected(e)) {
        return "undirected";
    }
    if (folding.mateOf(e) !== INVALID_INDEX || folding.isMutual(e)) {
        return "mutual";
    }
    return "directed";
}

/**
 * Write the document as text parts.
 * @param given - the snapshot
 * @param options - the caller's options
 * @yields one part per element or line group
 * @returns nothing
 */
function* writeGexf(given: GraphSnapshot, options: GexfWriteOptions | undefined): Generator<string, void, undefined> {
    const styled = gexfStyledExport(given, options?.styles);
    const snapshot = styled?.snapshot ?? given;
    const plan = planExport(snapshot, options);
    const { version } = plan;
    const ids = sanitizeIds(snapshot, "any", plan.options.sanitizeIds);
    const idText = (index: number): string => escapeXmlAttribute(String(ids.idAt(index)));
    const ns = GEXF_NAMESPACES[version];
    const { meta } = snapshot;

    yield '<?xml version="1.0" encoding="UTF-8"?>\n';
    yield `<gexf xmlns="${ns.gexf}" xmlns:viz="${ns.viz}" version="${version}">\n`;
    yield metaElement(meta, styled);
    yield graphStart(snapshot, plan);
    yield attributesGroups("node", plan.nodeAttrs, "    ");
    yield attributesGroups("edge", plan.edgeAttrs, "    ");

    // nodes
    const writeZ = positionWritesZ(plan.nodeRoles.position);
    yield `    <nodes count="${snapshot.nodeCount}">\n`;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        yield nodeElement(i, plan, idText, writeZ, styled);
    }
    yield "    </nodes>\n";

    // edges: the count is decided in a cheap first pass (no strings built) so the section
    // streams element by element instead of buffering every edge
    const edgeList = snapshot.edgeList();
    const folding = pairFolding(snapshot, { foldMutual: true });
    const edges: EdgeWriteContext = {
        plan,
        idText,
        styled,
        edgeList,
        weights: explicitWeights(snapshot),
        defaultType: defaultEdgeType(snapshot),
    };
    let written = 0;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (edgeType(snapshot, e, folding) !== null) {
            written++;
        }
    }
    yield `    <edges count="${written}">\n`;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const type = edgeType(snapshot, e, folding);
        if (type !== null) {
            yield edgeElement(e, type, edges);
        }
    }
    yield "    </edges>\n";
    yield "  </graph>\n";
    yield "</gexf>\n";
}

/** What writing one `<edge>` needs beyond its index and type. */
interface EdgeWriteContext {
    readonly plan: ExportPlan;
    readonly idText: (index: number) => string;
    readonly styled: GexfStyledExport | null;
    readonly edgeList: ReturnType<GraphSnapshot["edgeList"]>;
    readonly weights: ReturnType<typeof explicitWeights>;
    readonly defaultType: GexfEdgeType;
}

/**
 * One `<node>` element.
 * @param i - the node index
 * @param plan - the plan
 * @param idText - the escaped id text of a node index
 * @param writeZ - whether viz:position gets its z attribute
 * @param styled - the export's styles, or null
 * @returns the lines
 */
function nodeElement(
    i: number,
    plan: ExportPlan,
    idText: (index: number) => string,
    writeZ: boolean,
    styled: GexfStyledExport | null,
): string {
    const { nodeRoles } = plan;
    let attrs = ` id="${idText(i)}"`;
    if (nodeRoles.label?.isSet(i)) {
        attrs += ` label="${escapeXmlAttribute(String(nodeRoles.label.value(i)))}"`;
    }
    if (nodeRoles.parent?.isSet(i)) {
        attrs += ` pid="${idText(nodeRoles.parent.value(i) as number)}"`;
    }
    attrs += lifetimeAttrs(nodeRoles, i, plan);
    let body = attvaluesElement(plan.nodeAttrs, i, plan, "        ");
    body += parentsElement(nodeRoles.parents, i, idText);
    body += spellsElement(nodeRoles, i, plan, "        ");
    body += vizElements(nodeRoles, i, "        ", writeZ);
    body += styled?.node(i, "        ") ?? "";
    return body.length === 0 ? `      <node${attrs}/>\n` : `      <node${attrs}>\n${body}      </node>\n`;
}

/**
 * The `<parents>` element of one node.
 * @param parents - the parents role column, or null
 * @param i - the node index
 * @param idText - the escaped id text of a node index
 * @returns the lines, or an empty string
 */
function parentsElement(parents: Column | null, i: number, idText: (index: number) => string): string {
    if (!parents?.isSet(i)) {
        return "";
    }
    const items = listItems(parents, i) as readonly number[];
    if (items.length === 0) {
        return "";
    }
    let body = "        <parents>\n";
    for (const p of items) {
        body += `          <parent for="${idText(p)}"/>\n`;
    }
    return `${body}        </parents>\n`;
}

/**
 * One `<edge>` element of a logical edge that is written.
 * @param e - the logical edge index
 * @param type - its edge type
 * @param ctx - what writing an edge needs
 * @returns the lines
 */
function edgeElement(e: number, type: GexfEdgeType, ctx: EdgeWriteContext): string {
    const { plan, idText, edgeList } = ctx;
    const { edgeRoles, version } = plan;
    let attrs = "";
    if (edgeRoles.id?.isSet(e)) {
        attrs += ` id="${escapeXmlAttribute(String(edgeRoles.id.value(e)))}"`;
    } else if (version === "1.2") {
        attrs += ` id="e${e}"`;
    }
    attrs += ` source="${idText(edgeList.src[e])}" target="${idText(edgeList.dst[e])}"`;
    if (type !== ctx.defaultType) {
        attrs += ` type="${type}"`;
    }
    const weight = ctx.weights.text(e);
    if (weight !== null) {
        attrs += ` weight="${weight}"`;
    }
    if (edgeRoles.label?.isSet(e)) {
        attrs += ` label="${escapeXmlAttribute(String(edgeRoles.label.value(e)))}"`;
    }
    if (version === "1.3" && edgeRoles.kind?.isSet(e)) {
        attrs += ` kind="${escapeXmlAttribute(String(edgeRoles.kind.value(e)))}"`;
    }
    attrs += lifetimeAttrs(edgeRoles, e, plan);
    let body = attvaluesElement(plan.edgeAttrs, e, plan, "        ");
    body += spellsElement(edgeRoles, e, plan, "        ");
    body += vizElements(edgeRoles, e, "        ", false);
    body += ctx.styled?.edge(e, "        ") ?? "";
    return body.length === 0 ? `      <edge${attrs}/>\n` : `      <edge${attrs}>\n${body}      </edge>\n`;
}

/**
 * The `<meta>` element.
 * @param meta - the graph meta
 * @param styled - the export's styles, whose block goes into `<meta>`, or null
 * @returns the lines, or an empty string when nothing is set
 */
function metaElement(meta: GraphSnapshot["meta"], styled: GexfStyledExport | null): string {
    let body = "";
    if (meta.creator !== null) {
        body += `    <creator>${escapeXmlText(meta.creator)}</creator>\n`;
    }
    if (meta.description !== null) {
        body += `    <description>${escapeXmlText(meta.description)}</description>\n`;
    }
    if (meta.keywords.length > 0) {
        body += `    <keywords>${escapeXmlText(meta.keywords.join(", "))}</keywords>\n`;
    }
    if (styled !== null) {
        body += `    ${styled.blockElement}\n`;
    }
    const modified = meta.modified === null ? "" : ` lastmodifieddate="${escapeXmlAttribute(meta.modified)}"`;
    if (body.length === 0 && modified.length === 0) {
        return "";
    }
    return body.length === 0 ? `  <meta${modified}/>\n` : `  <meta${modified}>\n${body}  </meta>\n`;
}

/**
 * The `idtype` attribute of the `<graph>` tag.
 * @param snapshot - the snapshot
 * @returns the attribute text with a leading space, or an empty string
 */
function graphIdTypeAttr(snapshot: GraphSnapshot): string {
    let { idType } = snapshot.meta;
    if (idType === null) {
        const { kind } = snapshot.ids;
        if (kind === "string") {
            idType = "string";
        } else if (kind !== "mixed") {
            idType = "integer";
        }
    }
    return idType === "integer" || idType === "string" ? ` idtype="${idType}"` : "";
}

/**
 * The `start`, `end` and `timestamp` attributes of the `<graph>` tag.
 * @param snapshot - the snapshot
 * @param plan - the plan
 * @returns the attribute text with leading spaces, or an empty string
 */
function graphHeaderAttrs(snapshot: GraphSnapshot, plan: ExportPlan): string {
    const timestamp = graphExtraText(snapshot, "timestamp");
    const header: Record<string, string | null> = {
        start: graphExtraText(snapshot, "start"),
        end: graphExtraText(snapshot, "end"),
        timestamp,
    };
    if (plan.version === "1.2" && timestamp !== null) {
        // GEXF 1.2 has no timestamp: the graph's becomes a closed interval, as an element's does
        header.start ??= timestamp;
        header.end ??= timestamp;
        header.timestamp = null;
    }
    let attrs = "";
    for (const [key, value] of Object.entries(header)) {
        if (value !== null) {
            attrs += ` ${key}="${escapeXmlAttribute(value)}"`;
        }
    }
    return attrs;
}

/**
 * The `<graph>` start tag with its header attributes.
 * @param snapshot - the snapshot
 * @param plan - the plan
 * @returns the line
 */
function graphStart(snapshot: GraphSnapshot, plan: ExportPlan): string {
    const { meta } = snapshot;
    let attrs = ` defaultedgetype="${defaultEdgeType(snapshot)}"`;
    let mode = meta.mode ?? "static";
    if (plan.temporal && mode === "static") {
        mode = "dynamic";
    }
    if (plan.version === "1.2" && mode === "slice") {
        mode = "dynamic";
    }
    attrs += ` mode="${mode}"`;
    attrs += graphIdTypeAttr(snapshot);
    if (plan.timeFormat !== null) {
        attrs += ` timeformat="${plan.timeFormat}"`;
    } else if (plan.temporal) {
        attrs += ' timeformat="double"';
    }
    if (plan.version === "1.3" && plan.timeRepresentation !== null) {
        attrs += ` timerepresentation="${plan.timeRepresentation}"`;
    }
    attrs += graphHeaderAttrs(snapshot, plan);
    return `  <graph${attrs}>\n`;
}

/**
 * The `defaultedgetype` to write: the snapshot's direction, or `mutual` for a directed snapshot
 * whose source file declared a mutual default (the importer reads that default as directed, with
 * every untyped edge mutual), so the default survives a round trip.
 * @param snapshot - the snapshot
 * @returns the edge type the header declares, and every edge without its own `type` takes
 */
function defaultEdgeType(snapshot: GraphSnapshot): GexfEdgeType {
    if (!snapshot.directed) {
        return "undirected";
    }
    return graphExtraText(snapshot, "defaultedgetype")?.trim().toLowerCase() === "mutual" ? "mutual" : "directed";
}

/**
 * A graph header value the GEXF importer recorded in `meta.extra.gexf` (defaultedgetype, start,
 * end, timestamp).
 * @param snapshot - the snapshot
 * @param key - the attribute name
 * @returns the text, or null when absent
 */
function graphExtraText(snapshot: GraphSnapshot, key: string): string | null {
    const gexfExtra = snapshot.meta.extra.gexf;
    if (typeof gexfExtra !== "object" || gexfExtra === null) {
        return null;
    }
    const value = (gexfExtra as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
}

/**
 * The GEXF exporter; `capabilities` describes the default 1.3 output.
 * @category Built-in formats
 */
export const gexfExporter: GraphExporter<GexfExportOptions> = Object.freeze({
    format: GEXF_FORMAT,
    options: Object.freeze(["version"]),
    capabilities: CAPABILITIES_1_3,
    styles: Object.freeze({ capabilities: GEXF_STYLE_CAPABILITIES }),
    /**
     * Pre-flight: what export() would lose.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the loss notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: GexfWriteOptions): readonly LossNote[] {
        const styled = gexfStyledExport(snapshot, options?.styles);
        return Object.freeze([...planExport(styled?.snapshot ?? snapshot, options).notes, ...(styled?.notes ?? [])]);
    },
    /**
     * Write the snapshot as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the chunks
     */
    export(snapshot: GraphSnapshot, options?: GexfWriteOptions): AsyncIterable<Uint8Array> {
        return encodeChunks(writeGexf(snapshot, options));
    },
    /**
     * Write the snapshot as one string.
     * @param snapshot - the snapshot
     * @param options - format-specific and common options
     * @returns the document
     */
    async exportToString(snapshot: GraphSnapshot, options?: GexfWriteOptions): Promise<string> {
        return joinText(writeGexf(snapshot, options));
    },
});

/**
 * The capabilities of a 1.2 export, for callers that pass `version: "1.2"`.
 * @category Built-in formats
 */
export const GEXF_1_2_CAPABILITIES: ExportCapabilities = CAPABILITIES_1_2;
