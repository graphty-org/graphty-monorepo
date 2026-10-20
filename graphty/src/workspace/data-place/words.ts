/**
 * The Data place's words and arrangement (data prototype spec sections 3.2 and 3.3): what each
 * Sources row and each Fields row says, in which order. Every fact comes from graphty-element
 * (`data.sources()`, `data.loads()`, `data.attributes()`); this file only words and orders it.
 */

import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type {
    ColumnRole,
    Endpoint,
    LoadedSource,
    TableMapping,
    TableMappingRead,
} from "@graphty/graphty-element/session";

import { formatNumber } from "../inspector/words";

/**
 * A server load's count beside its name: how many nodes it brought of how many the source holds.
 * @param loaded - the nodes the load brought.
 * @param total - the nodes the source holds, when it says.
 * @returns such as "500 of 40,000", or "500" when the source does not say.
 */
export function serverCount(loaded: number, total: number | undefined): string {
    return total === undefined ? formatNumber(loaded) : `${formatNumber(loaded)} of ${formatNumber(total)}`;
}

/**
 * A joined table's match: "52/70", matched rows of all its rows.
 * @param source - the joined load.
 * @returns the words, or null when the load is not a join.
 */
export function joinMatch(source: LoadedSource): string | null {
    return source.join === undefined ? null : `${formatNumber(source.join.matched)}/${formatNumber(source.join.rows)}`;
}

/** Which table of a load a Fields row reads its column from. */
export type FieldSide = "nodes" | "edges";

/** What a Fields row sets. */
export type FieldKey = "key" | "label" | "kind" | "time" | "source" | "target" | "weight" | "sourceKind" | "targetKind";

/** One Fields row. */
export interface FieldRow {
    readonly key: FieldKey;
    readonly side: FieldSide;
    /** The row's label, such as "Kind of source". */
    readonly label: string;
    /**
     * Read when the rows load, so changing it reads the load again (`data.reloadSource`); the
     * others are settings the element changes in place (`data.setRole`).
     */
    readonly atLoad: boolean;
}

/** The Fields rows, in order (section 3.3): the node roles, then the edge roles. */
export const FIELD_ROWS: readonly FieldRow[] = [
    { key: "key", side: "nodes", label: "Id", atLoad: true },
    { key: "label", side: "nodes", label: "Label", atLoad: false },
    { key: "kind", side: "nodes", label: "Kind", atLoad: true },
    { key: "time", side: "nodes", label: "Node time", atLoad: false },
    { key: "source", side: "edges", label: "Source", atLoad: true },
    { key: "target", side: "edges", label: "Target", atLoad: true },
    { key: "weight", side: "edges", label: "Weight", atLoad: false },
    { key: "time", side: "edges", label: "Edge time", atLoad: false },
    { key: "sourceKind", side: "edges", label: "Kind of source", atLoad: true },
    { key: "targetKind", side: "edges", label: "Kind of target", atLoad: true },
];

/** What a weight means, as the element's `knownFields.edgeWeightMeaning` names it; "" is unknown. */
export const WEIGHT_MEANINGS = [
    { value: "", label: "unknown" },
    { value: "distance", label: "distance" },
    { value: "similarity", label: "similarity" },
    { value: "capacity", label: "capacity" },
] as const;

/** The direction choices, as the element's `data.directed` takes them. */
export const DIRECTIONS = [
    { value: "true", label: "Directed" },
    { value: "false", label: "Undirected" },
    { value: "auto", label: "Auto" },
] as const;

/**
 * The table of one side a load read, with the roles it read it with.
 * @param source - the load.
 * @param side - nodes or edges.
 * @returns the table's roles, or undefined when the load kept none or read no such table.
 */
export function tableRoles(source: LoadedSource | undefined, side: FieldSide): TableMappingRead | undefined {
    return Object.values(source?.mapping?.tables ?? {}).find((table) => table.rowsAre === side);
}

/**
 * The column (or kind name) a load-time row holds, as the load read it.
 * @param roles - the table's roles.
 * @param key - the row.
 * @returns the column or kind name, or null for none.
 */
export function loadValue(roles: TableMappingRead | undefined, key: FieldKey): string | null {
    const value: unknown = roles?.[key as keyof TableMappingRead];
    if (typeof value === "string") {
        return value;
    }
    return typeof value === "object" && value !== null ? (value as Endpoint).column : null;
}

/** What Fields' Rows are row offers: what one table's rows load as. */
export const ROWS_ARE: readonly FieldSide[] = ["nodes", "edges"];

/**
 * The sides a load's own rows hold, so Fields shows only its rows: a join's shape, else what its
 * tables were read as.
 * @param source - the load.
 * @returns the sides, or undefined when the load does not say (a graph file, a network load).
 */
export function sidesOf(source: LoadedSource | undefined): FieldSide[] | undefined {
    const shape = source?.join?.shape;
    if (shape === "node-values") {
        return ["nodes"];
    }
    if (shape === "edge-values" || shape === "edges") {
        return ["edges"];
    }
    const rows = source?.tableRows ?? Object.values(source?.mapping?.tables ?? {}).map((table) => table.rowsAre);
    return rows.length === 0 ? undefined : [...new Set(rows)];
}

/**
 * Whether a column holds numbers, so it can be a weight.
 * @param attribute - the column.
 * @returns true for numbers.
 */
export function isNumeric(attribute: AttributeDescriptor): boolean {
    return attribute.type === "number" || attribute.type === "integer";
}

/** The attribute kind of each side. */
export const KIND_OF: Readonly<Record<FieldSide, "node" | "edge">> = { nodes: "node", edges: "edge" };

/**
 * The column holding a setting row's role now, as the element's attribute roles say.
 * @param attributes - `data.attributes()`.
 * @param side - nodes or edges.
 * @param role - the role.
 * @returns the column's name, or null for none.
 */
export function roleHolder(
    attributes: readonly AttributeDescriptor[],
    side: FieldSide,
    role: ColumnRole,
): string | null {
    return attributes.find((a) => a.kind === KIND_OF[side] && a.roles?.includes(role as never) === true)?.name ?? null;
}

/**
 * The columns a Fields row offers for one load: the load's data columns of the side, hidden ones
 * left out unless one holds the row now, with that one first when it is not a column (an endpoint
 * the load does not keep as an attribute).
 * @param attributes - `data.attributes()`.
 * @param source - the load, or undefined for every load.
 * @param side - nodes or edges.
 * @param current - the column the row holds now, or null.
 * @returns the column names.
 */
export function columnChoices(
    attributes: readonly AttributeDescriptor[],
    source: LoadedSource | undefined,
    side: FieldSide,
    current: string | null,
): string[] {
    const names = attributes
        .filter(
            (a) =>
                a.kind === KIND_OF[side] &&
                a.path.startsWith("data.") &&
                (a.hidden !== true || a.name === current) &&
                (source === undefined || a.sources === undefined || a.sources.includes(source.key)),
        )
        .map((a) => a.name);
    return current === null || names.includes(current) ? names : [current, ...names];
}

/**
 * The kind names an endpoint's kind row offers: the endpoint columns' own names (an auth log's
 * `user` and `host`), which is what a reader calls the things in them, and the current kind.
 * @param roles - the edge table's roles.
 * @param current - the kind now, or null.
 * @returns the names.
 */
export function kindChoices(roles: TableMappingRead | undefined, current: string | null): string[] {
    const names = [loadValue(roles, "source"), loadValue(roles, "target"), current].filter(
        (name): name is string => name !== null,
    );
    return [...new Set(names)];
}

/**
 * A load-time mapping that changes one role, in the shape the load's table is named by: a bare
 * mapping for a load of one table, the table by id otherwise.
 * @param source - the load.
 * @param side - which table.
 * @param roles - the roles to change.
 * @returns the mapping.
 */
export function remap(
    source: LoadedSource,
    side: FieldSide,
    roles: TableMapping,
): TableMapping | { tables: Record<string, TableMapping> } {
    const tables = Object.entries(source.mapping?.tables ?? {});
    const id = tables.find(([, table]) => table.rowsAre === side)?.[0];
    return tables.length <= 1 || id === undefined ? roles : { tables: { [id]: roles } };
}
