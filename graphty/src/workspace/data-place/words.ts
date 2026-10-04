/**
 * The Data place's words and arrangement (tier1-design.md section 2.6): what each Sources row and
 * each Attributes row says, in which order. Every fact comes from graphty-element
 * (`data.source()`, `data.lastImport()`, `data.attributes()`); this file only words and orders it.
 */

import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { ColumnRef, DataSourceDescriptor, ImportReport } from "@graphty/graphty-element/session";

/** What a Sources row's glyph shows: a graph file holding both tables, or one table. */
export type SourceKind = "file" | "nodes" | "edges";

/** One Sources row. */
export interface SourceRow {
    readonly id: string;
    readonly kind: SourceKind;
    readonly name: string;
    /** The quiet line: "34 nodes, 78 edges"; "254 rows, 254 edges". */
    readonly quiet: string;
    readonly children?: readonly SourceRow[];
}

/** What an Attributes row's type glyph shows. */
export type TypeGlyph = "category" | "number" | "ordinal" | "time" | "unknown";

/** One Attributes row. */
export interface AttributeRow {
    /** `node:<name>` or `edge:<name>`: the inspected id. */
    readonly id: string;
    readonly column: ColumnRef;
    readonly name: string;
    readonly glyph: TypeGlyph;
    /** The type glyph's word, for the row's tooltip and accessible description. */
    readonly typeWord: string;
    /** "20%" when not every element has a value; null when all do. */
    readonly fill: string | null;
}

/** Find appears past this many attributes (section 2.6). */
export const FIND_PAST = 15;

/**
 * A count and its noun, singular for one.
 * @param n - the count.
 * @param noun - the singular noun.
 * @returns such as "1 node" or "34 nodes".
 */
export function count(n: number, noun: string): string {
    return `${n.toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The Sources rows for what the element says was loaded. A graph file that brought both node and
 * edge records is one row that expands to its node table and edge table; a source that brought
 * one kind of record is that one table.
 * @param source - `data.source()`.
 * @param report - `data.lastImport()`.
 * @returns the rows, empty when nothing was imported.
 */
export function sourceRows(source: DataSourceDescriptor | null, report: ImportReport | null): SourceRow[] {
    if (source === null || report === null) {
        return [];
    }
    const name = source.name ?? "Untitled data";
    const { nodes, edges, nodeRecords, edgeRecords } = report.counts;
    const nodeTable: SourceRow = {
        id: "source:nodes",
        kind: "nodes",
        name: "Nodes",
        quiet: `${count(nodeRecords, "row")}, ${count(nodes, "node")}`,
    };
    const edgeTable: SourceRow = {
        id: "source:edges",
        kind: "edges",
        name: "Edges",
        quiet: `${count(edgeRecords, "row")}, ${count(edges, "edge")}`,
    };
    if (nodeRecords > 0 && edgeRecords > 0) {
        return [
            {
                id: "source",
                kind: "file",
                name,
                quiet: `${count(nodes, "node")}, ${count(edges, "edge")}`,
                children: [nodeTable, edgeTable],
            },
        ];
    }
    const only = edgeRecords > 0 ? edgeTable : nodeTable;
    return [{ ...only, id: "source", name }];
}

/**
 * The glyph and its word for what a column measures. An absent measurement is a column with no
 * values.
 * @param measurement - `AttributeDescriptor.measurement`.
 * @returns the glyph and its word.
 */
function typeOf(measurement: string | undefined): { glyph: TypeGlyph; typeWord: string } {
    switch (measurement) {
        case "categorical":
            return { glyph: "category", typeWord: "Category" };
        case "quantitative":
            return { glyph: "number", typeWord: "Number" };
        case "ordinal":
            return { glyph: "ordinal", typeWord: "Ordered category" };
        case "time":
            return { glyph: "time", typeWord: "Time" };
        default:
            return { glyph: "unknown", typeWord: "No values" };
    }
}

/**
 * One kind's Attributes rows, by name. (Computed attributes, which the design lists first, are
 * not in tier 1: section 7.)
 * @param attributes - `data.attributes()`.
 * @param kind - the subhead's kind.
 * @param filter - the Find box's text; empty lists every row.
 * @returns the rows.
 */
export function attributeRows(
    attributes: readonly AttributeDescriptor[],
    kind: "node" | "edge",
    filter = "",
): AttributeRow[] {
    const needle = filter.trim().toLocaleLowerCase();
    return attributes
        .filter((a) => a.kind === kind && a.name.toLocaleLowerCase().includes(needle))
        .map((a) => ({
            id: `${a.kind}:${a.name}`,
            column: { kind: a.kind, name: a.name },
            name: a.name,
            ...typeOf(a.measurement),
            fill: a.completeness < 1 ? `${String(Math.floor(a.completeness * 100))}%` : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The column an inspected attribute id names.
 * @param id - `node:<name>` or `edge:<name>`.
 * @returns the column, or null for an id that is not an attribute's.
 */
export function columnOf(id: string): ColumnRef | null {
    const at = id.indexOf(":");
    const kind = at < 0 ? "" : id.slice(0, at);
    return kind === "node" || kind === "edge" ? { kind, name: id.slice(at + 1) } : null;
}
