/**
 * What the two ontology exporters share (the OBO flat file and the JSON exporter's `obographs`
 * dialect): the snapshot columns that fill the OBO slots (the label as `name`, the edge kind as
 * `relation`), the placeholder nodes a re-import makes again by itself, the order a re-import gives
 * the nodes, and the text of a cell. Both read the snapshot through the column vocabulary of
 * ontology.ts, so a column means the same thing in both files.
 */

import { type Column, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";

import { type ExportCapabilities } from "../types.js";
import { COLUMN_AS_PROPERTY_VALUE_CODE, ROLE_ASSUMED_CODE } from "./codes.js";
import { checkCapabilities, LOSS } from "./export.js";
import { formatNumber } from "./format.js";
import { PLACEHOLDER_COLUMN } from "./ontology.js";
import { type ResolvedExportOptions } from "./options.js";

/** A note recorder. */
export type NoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/** The generic notes the ontology formats replace with their own (see capabilityNotes()). */
const SUPERSEDED: ReadonlySet<string> = new Set([LOSS.DTYPE, LOSS.LIST, LOSS.JSON, LOSS.COMPONENTS, LOSS.GRAPH_ATTRIBUTES]);

/** The roles the ontology formats have a slot for, and the column names their importers give them. */
const SLOT_ROLES: ReadonlySet<string> = new Set(["label", "kind"]);
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({ label: "name", kind: "relation" });

/** The roles whose columns are never written as values (their loss notes come from checkCapabilities()). */
export const UNWRITTEN_ROLES: ReadonlySet<string> = new Set([
    "directed",
    "pair",
    "mutual",
    "weight",
    "timeText",
    "originalId",
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

/** The OBO frame types. */
export type FrameKind = "Term" | "Instance" | "Typedef";

/** The frame types as a set, for checking a `type` cell. */
export const FRAME_KINDS: ReadonlySet<string> = new Set(["Term", "Instance", "Typedef"]);

/**
 * The value of a set cell (a multi-component value as a plain array), or undefined when unset; a
 * declared default is not a value here (the formats have no defaults and say so).
 * @param column - the column
 * @param row - the row
 * @returns the value or undefined
 */
export function cellOf(column: Column, row: number): unknown {
    if (!column.isSet(row)) {
        return undefined;
    }
    const value: unknown = column.value(row);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value;
}

/**
 * The text of a scalar value: a number by its dtype's shortest round-tripping form (`-0` kept), a
 * boolean as `true` / `false`, a string as it is, anything else as its JSON text.
 * @param value - the value
 * @param dtype - the dtype it came from (the item dtype for a list item)
 * @returns the text
 */
export function textOf(value: unknown, dtype: string): string {
    switch (typeof value) {
        case "string":
            return value;
        case "boolean":
            return value ? "true" : "false";
        case "number":
            return formatNumber(value, dtype === "f32" || dtype === "i32" || dtype === "u32" || dtype === "u8" ? dtype : "f64");
        default:
            return JSON.stringify(value) ?? "null";
    }
}

/**
 * Whether a column has the dtype of a vocabulary column (string and dict both fit a text column;
 * the other text dtype is reported, not refused).
 * @param want - the vocabulary dtype
 * @param column - the column
 * @returns true when the column can be written into the vocabulary slot
 */
export function fitsVocabulary(want: string, column: Column): boolean {
    switch (want) {
        case "list":
        case "bool":
        case "json":
            return column.dtype === want;
        default:
            return isText(column);
    }
}

/**
 * The values of a cell that may hold one value or a list of them.
 * @param value - the cell value, or undefined
 * @returns the values
 */
export function valuesOf(value: unknown): readonly unknown[] {
    if (value === undefined) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

/** A column chosen for an OBO slot. */
interface Slot {
    /** The column, or null when the snapshot has none for the slot. */
    readonly column: Column | null;
    /** Whether a role-less column was chosen by its name; it reads back with the role (W_ROLE_ASSUMED). */
    readonly assumed: boolean;
}

/**
 * The column of a slot: the column with the role when it holds text, else a role-less text column
 * of the slot's name (which the importer reads back with the role).
 * @param table - the node or edge table
 * @param role - the role (`label` for `name`, `kind` for `relation`)
 * @param name - the name the importer gives the slot
 * @returns the column and whether its role is assumed
 */
export function slotColumn(table: GraphSnapshot["nodes"], role: "label" | "kind", name: string): Slot {
    const byRole = table.byRole(role);
    if (byRole !== null) {
        return { column: isText(byRole) ? byRole : null, assumed: false };
    }
    const byName = table.get(name);
    if (byName !== null && byName.meta.role === null && isText(byName)) {
        return { column: byName, assumed: true };
    }
    return { column: null, assumed: false };
}

/**
 * Whether a column holds text (string or dict).
 * @param column - the column
 * @returns true for string and dict
 */
function isText(column: Column): boolean {
    return column.dtype === "string" || column.dtype === "dict";
}

/**
 * The placeholder column (`graphty.placeholder`, a bool), or null.
 * @param snapshot - the snapshot
 * @returns the column
 */
function placeholderColumn(snapshot: GraphSnapshot): Column | null {
    const column = snapshot.nodes.get(PLACEHOLDER_COLUMN);
    return column !== null && column.dtype === "bool" ? column : null;
}

/**
 * The nodes written without a frame (OBO) or a node record (OBO Graphs) because the re-import makes
 * them again as placeholders: a `graphty.placeholder` true cell, no other set cell, an id written
 * as it is, an edge that references it, and (in the flat file, where an edge is written on its
 * source's frame) no edge of its own.
 * @param snapshot - the snapshot
 * @param written - the logical edges written
 * @param options - `outgoingAllowed`: whether a placeholder may be an edge's source; `changed`: whether a node's id is rewritten
 * @param options.outgoingAllowed - whether a placeholder may be an edge's source
 * @param options.changed - whether a node's id is rewritten
 * @returns one flag per node, 1 for a node written without a frame
 */
export function framelessNodes(
    snapshot: GraphSnapshot,
    written: readonly number[],
    options: { readonly outgoingAllowed: boolean; readonly changed: (i: number) => boolean },
): Uint8Array {
    const flags = new Uint8Array(snapshot.nodeCount);
    const placeholder = placeholderColumn(snapshot);
    if (placeholder === null) {
        return flags;
    }
    const { src, dst } = snapshot.edgeList();
    const referenced = new Uint8Array(snapshot.nodeCount);
    const sources = new Uint8Array(snapshot.nodeCount);
    for (const e of written) {
        referenced[dst[e]] = 1;
        if (options.outgoingAllowed) {
            referenced[src[e]] = 1;
        } else {
            sources[src[e]] = 1;
        }
    }
    const others = [...snapshot.nodes].filter((c) => c !== placeholder);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        if (
            placeholder.isSet(i) &&
            placeholder.value(i) === true &&
            referenced[i] === 1 &&
            sources[i] === 0 &&
            !options.changed(i) &&
            others.every((c) => !c.isSet(i))
        ) {
            flags[i] = 1;
        }
    }
    return flags;
}

/**
 * How many nodes a re-import puts at another index: the written nodes keep their order and the
 * placeholders follow in the order the edges first reference them.
 * @param frameless - the framelessNodes() flags
 * @param references - the node indices in the order the written edges reference them
 * @returns the number of nodes whose index changes
 */
export function movedNodes(frameless: Uint8Array, references: Iterable<number>): number {
    const order: number[] = [];
    for (let i = 0; i < frameless.length; i++) {
        if (frameless[i] === 0) {
            order.push(i);
        }
    }
    const seen = new Uint8Array(frameless.length);
    for (const i of references) {
        if (frameless[i] === 1 && seen[i] === 0) {
            seen[i] = 1;
            order.push(i);
        }
    }
    let moved = 0;
    for (let k = 0; k < order.length; k++) {
        if (order[k] !== k) {
            moved++;
        }
    }
    return moved;
}

/**
 * Whether a value is a qualifier record as the importers make it: a non-empty object of names to a
 * text or a list of two or more texts (a name given once reads back as a text, never as a
 * one-item list), every name passing `nameOk`.
 * @param value - the value
 * @param nameOk - the name rule
 * @returns true when the record is written and read back unchanged
 */
export function isQualifierRecord(value: unknown, nameOk: (name: string) => boolean): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const entries = Object.entries(value);
    return (
        entries.length > 0 &&
        entries.every(
            ([name, v]) =>
                nameOk(name) &&
                (typeof v === "string" ||
                    (Array.isArray(v) && v.length >= 2 && v.every((item) => typeof item === "string"))),
        )
    );
}

/** What capabilityNotes() needs to know about the export. */
interface CapabilityNoteSpec {
    /** The format's capabilities. */
    readonly caps: ExportCapabilities;
    /** The label column written as the name, or null. */
    readonly label: Column | null;
    /** Whether the label is a role-less `name` column. */
    readonly labelAssumed: boolean;
    /** Where an edge column without a slot goes, for messages ("a qualifier"). */
    readonly edgeSlot: string;
    /** Records a note. */
    readonly note: NoteFn;
}

/**
 * The generic notes of checkCapabilities() as the ontology formats see them. No column of the
 * snapshot's own survives as a column (the formats keep only the OBO vocabulary), so the generic
 * dtype, list, json, strides and graph-attribute notes give way to the formats' own, which say
 * where each column goes (a vocabulary column written into its slot needs no note; any other
 * becomes property values, edge qualifiers or metadata). The name-change notes stand only for the
 * label and kind columns actually written into their slot. Added: the roles without a slot (a
 * node kind, an edge label) and a role-less `name` column taking the label role.
 * @param snapshot - the snapshot
 * @param common - the common options
 * @param spec - the export's facts
 * @returns the fatal error of a mixed graph under onMixedDirection "error", or null
 */
export function capabilityNotes(
    snapshot: GraphSnapshot,
    common: ResolvedExportOptions,
    spec: CapabilityNoteSpec,
): GraphFormatError | null {
    const { label, note } = spec;
    let fatal: GraphFormatError | null = null;
    const kind = snapshot.edges.byRole("kind");
    for (const gen of checkCapabilities(snapshot, spec.caps, common, { roles: SLOT_ROLES, roleNames: ROLE_NAMES })) {
        if (SUPERSEDED.has(gen.code)) {
            continue;
        }
        if (gen.code === LOSS.COLUMN_NAME_CHANGED) {
            const isLabel = label !== null && gen.column === label.meta.name;
            const isKind = kind !== null && gen.column === kind.meta.name && isText(kind);
            if (!isLabel && !isKind) {
                continue;
            }
        }
        if (gen.code === LOSS.MIXED_DIRECTION_ERROR && fatal === null) {
            fatal = new GraphFormatError("E_DIRECTED", gen.message, { reason: "mixed direction" });
        }
        note(gen.code, gen.message, gen.column, gen.count);
    }
    const nodeKind = snapshot.nodes.byRole("kind");
    if (nodeKind !== null) {
        note(
            LOSS.ROLE,
            `node column "${nodeKind.meta.name}" (kind) is written as property values; the format has no node kind slot`,
            nodeKind.meta.name,
            nodeKind.length - nodeKind.nullCount,
        );
    }
    const edgeLabel = snapshot.edges.byRole("label");
    if (edgeLabel !== null) {
        note(
            LOSS.ROLE,
            `edge column "${edgeLabel.meta.name}" (label) is written as ${spec.edgeSlot}; the format has no edge label slot`,
            edgeLabel.meta.name,
            edgeLabel.length - edgeLabel.nullCount,
        );
    }
    if (label !== null && spec.labelAssumed) {
        note(
            ROLE_ASSUMED_CODE,
            `node column "name" is written as each node's name and reads back as the label`,
            "name",
            label.length - label.nullCount,
        );
    }
    return fatal;
}

/**
 * Record the columns that read back absent: a node or edge column without a set cell on a written
 * element (the importers declare a column when a value needs it).
 * @param snapshot - the snapshot
 * @param rows - the written nodes
 * @param frameless - the frameless flags (a placeholder column set only there reads back)
 * @param written - the written edges
 * @param note - records a note
 */
export function emptyColumnNotes(
    snapshot: GraphSnapshot,
    rows: readonly number[],
    frameless: Uint8Array,
    written: readonly number[],
    note: NoteFn,
): void {
    const tables = [
        [
            "node",
            snapshot.nodes,
            (c: Column): boolean =>
                rows.some((i) => c.isSet(i)) ||
                (c.meta.name === PLACEHOLDER_COLUMN && frameless.some((f, i) => f === 1 && c.isSet(i))),
        ],
        ["edge", snapshot.edges, (c: Column): boolean => written.some((e) => c.isSet(e))],
    ] as const;
    for (const [domain, table, used] of tables) {
        for (const column of table) {
            const { role, name } = column.meta;
            if ((role !== null && (UNWRITTEN_ROLES.has(role) || (domain === "edge" && role === "id"))) || used(column)) {
                continue;
            }
            note(LOSS.EMPTY_COLUMN, `${domain} column "${name}" has no value to write; it reads back absent`, name, 0);
        }
    }
}

/**
 * Record the note of a node column written as property values.
 * @param note - the recorder
 * @param column - the column
 * @param rows - the written nodes
 * @param how - how the values are written, for the message
 */
export function notePropertyColumn(note: NoteFn, column: Column, rows: readonly number[], how: string): void {
    const count = rows.filter((i) => column.isSet(i)).length;
    if (count === 0) {
        return;
    }
    const role = column.meta.role === null ? "" : ` (its ${column.meta.role} role is lost)`;
    note(
        COLUMN_AS_PROPERTY_VALUE_CODE,
        `node column "${column.meta.name}" is written as ${how} and reads back inside the property_value column, not as its own column${role}`,
        column.meta.name,
        count,
    );
}
