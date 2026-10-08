/**
 * The Data place's words and arrangement (tier1-design.md section 2.6): what each Sources row and
 * each Attributes row says, in which order. Every fact comes from graphty-element
 * (`data.sources()`, `data.lastImport()`, `data.attributes()`); this file only words and orders it.
 */

import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { CodedFact, ColumnRef, ImportReport, LoadedSource } from "@graphty/graphty-element/session";

/** What a Sources row's glyph shows: a graph file holding both tables, or one table. */
export type SourceKind = "file" | "nodes" | "edges";

/** One Sources row. */
export interface SourceRow {
    readonly id: string;
    readonly kind: SourceKind;
    readonly name: string;
    /** The quiet line: "34 nodes, 78 edges"; "254 rows, 254 edges"; "77 nodes"; "12 nodes, 22 edges, 1 row left out". */
    readonly quiet: string;
    readonly children?: readonly SourceRow[];
}

/** What an Attributes row's glyph shows: what the column measures, or the run that made it. */
export type TypeGlyph = "category" | "number" | "ordinal" | "time" | "unknown" | "result";

/** One Attributes row. */
export interface AttributeRow {
    /** `node:<name>` or `edge:<name>`: the tree row's id (the inspected id is the path). */
    readonly id: string;
    readonly column: ColumnRef;
    readonly name: string;
    /** The accessible name: the name and its kind ("value, edge attribute"), unique across kinds. */
    readonly label: string;
    readonly glyph: TypeGlyph;
    /** The glyph's word ("Number", "Result of PageRank"), for the row's tooltip. */
    readonly typeWord: string;
    /** "20%" when not every element has a value; null when all do. */
    readonly fill: string | null;
    /** What a screen reader hears after the name: the type word, then the fill. */
    readonly description: string;
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
 * What a load added, as its row's quiet line. A kind it added none of is left out, so a narrow
 * row keeps room for its name.
 * @param added - `LoadedSource.added`.
 * @returns such as "20 nodes, 41 edges", "17 edges", or "0 nodes, 0 edges" for a load that added nothing.
 */
function addedWords(added: LoadedSource["added"]): string {
    const parts = [
        ...(added.nodes > 0 ? [count(added.nodes, "node")] : []),
        ...(added.edges > 0 ? [count(added.edges, "edge")] : []),
    ];
    return parts.length === 0 ? "0 nodes, 0 edges" : parts.join(", ");
}

/**
 * What a load left out, appended to its row's quiet line.
 * @param load - the load, an entry of `data.sources()`.
 * @returns such as ", 1 row left out", or "" when the load left nothing out.
 */
function leftOutWords(load: LoadedSource): string {
    return load.leftOut === undefined ? "" : `, ${count(load.leftOut.rows, "row")} left out`;
}

/**
 * The sentence that says why a load left rows out, for the inspector.
 * @param leftOut - `LoadedSource.leftOut`.
 * @returns such as "1 edge row was left out: it names 1 node no node row holds."
 */
export function leftOutSentence(leftOut: NonNullable<LoadedSource["leftOut"]>): string {
    const one = leftOut.rows === 1;
    return `${count(leftOut.rows, "edge row")} ${one ? "was" : "were"} left out: ${one ? "it names" : "they name"} ${count(leftOut.values, "node")} no node row holds.`;
}

/**
 * The index into `data.sources()` that a Sources row id names.
 * @param id - `source:<load>` or `source:<load>:<table>`.
 * @returns the index, or undefined for an id that is not a source row's.
 */
export function loadIndexOf(id: string): number | undefined {
    const [head, index] = id.split(":");
    const at = Number(index);
    return head === "source" && Number.isInteger(at) && at >= 0 ? at : undefined;
}

/**
 * The glyph of a load that read one table: a graph file when it brought both nodes and edges.
 * @param added - `LoadedSource.added`.
 * @returns the kind.
 */
function kindOf(added: LoadedSource["added"]): SourceKind {
    if (added.nodes > 0 && added.edges > 0) {
        return "file";
    }
    return added.edges > 0 ? "edges" : "nodes";
}

/**
 * The Sources rows for what the element says was loaded: one row per load, oldest first
 * (`data.sources()`). A load that read several tables expands to them. A graph that came from one
 * load of one table keeps the tier 1 rows: a graph file expands to its node table and edge table
 * (counted from `data.lastImport()`), and a source that brought one kind of record is that table.
 * @param sources - `data.sources()`.
 * @param report - `data.lastImport()`.
 * @returns the rows, empty when nothing was imported.
 */
export function sourceRows(sources: readonly LoadedSource[], report: ImportReport | null): SourceRow[] {
    const [only] = sources;
    if (sources.length === 1 && only.tables.length <= 1 && report !== null) {
        const rows = oneTableRows(only.name ?? "Untitled data", report);
        return rows.map((row) => ({ ...row, quiet: row.quiet + leftOutWords(only) }));
    }
    return sources.map((load, index) => {
        const id = `source:${String(index)}`;
        const name = loadName(load);
        if (load.tables.length > 1) {
            const children = load.tables.map((table, at): SourceRow => ({
                id: `${id}:${String(at)}`,
                kind: "file",
                name: table,
                quiet: "",
            }));
            return { id, kind: "file", name, quiet: addedWords(load.added) + leftOutWords(load), children };
        }
        return { id, kind: kindOf(load.added), name, quiet: addedWords(load.added) + leftOutWords(load) };
    });
}

/**
 * A load's name: the one it was given, else its tables'.
 * @param load - an entry of `data.sources()`.
 * @returns such as "people.csv and passes.csv".
 */
export function loadName(load: LoadedSource): string {
    return load.name ?? (load.tables.join(" and ") || "Untitled data");
}

/**
 * The rows for a graph that came from one load of one table.
 * @param name - the load's name.
 * @param report - `data.lastImport()`.
 * @returns the rows.
 */
function oneTableRows(name: string, report: ImportReport): SourceRow[] {
    const { nodes, edges, nodeRecords, edgeRecords } = report.counts;
    const nodeTable: SourceRow = {
        id: "source:0:nodes",
        kind: "nodes",
        name: "Node table",
        quiet: `${count(nodeRecords, "row")}, ${count(nodes, "node")}`,
    };
    const edgeTable: SourceRow = {
        id: "source:0:edges",
        kind: "edges",
        name: "Edge table",
        quiet: `${count(edgeRecords, "row")}, ${count(edges, "edge")}`,
    };
    if (nodeRecords > 0 && edgeRecords > 0) {
        return [
            {
                id: "source:0",
                kind: "file",
                name,
                quiet: `${count(nodes, "node")}, ${count(edges, "edge")}`,
                children: [nodeTable, edgeTable],
            },
        ];
    }
    // A lone node table reads "77 nodes"; only an edge table counts its rows (section 2.6).
    const table = edgeRecords > 0 ? edgeTable : { ...nodeTable, quiet: count(nodes, "node") };
    return [{ ...table, id: "source:0", name }];
}

/**
 * The graph header's provenance line: the one file the graph came from, or how many.
 * @param sources - `data.sources()`.
 * @returns such as "From friends.csv" or "From 3 files"; undefined when nothing was loaded.
 */
export function sourcesWords(sources: readonly LoadedSource[]): string | undefined {
    const files = sources.flatMap((load) =>
        load.tables.length > 1 ? load.tables : [load.name ?? load.tables[0] ?? "Untitled data"],
    );
    if (files.length <= 1) {
        return files.length === 0 ? undefined : `From ${files[0]}`;
    }
    // A URL is not a file.
    const noun = sources.some((load) => load.config?.url !== undefined) ? "sources" : "files";
    return `From ${String(files.length)} ${noun}`;
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
 * The share of elements with a value, as the row shows it. Rounded down, so a column missing one
 * value never reads 100%; a column with a few values reads "<1%", never the empty column's "0%".
 * @param completeness - from 0 to 1.
 * @returns such as "25%", or null when every element has a value.
 */
export function fillOf(completeness: number): string | null {
    if (completeness >= 1) {
        return null;
    }
    return completeness > 0 && completeness < 0.01 ? "<1%" : `${String(Math.floor(completeness * 100))}%`;
}

/**
 * One kind's Attributes rows: the results of runs first, marked by their run's glyph, then the
 * rest; each group by name (section 2.6).
 * @param attributes - `data.attributes()`.
 * @param kind - the subhead's kind.
 * @param filter - the Find box's text; empty lists every row.
 * @param runLabel - the label of the run a result came from (`runs.get(id)?.label`).
 * @returns the rows.
 */
export function attributeRows(
    attributes: readonly AttributeDescriptor[],
    kind: "node" | "edge",
    filter = "",
    runLabel: (runId: string) => string | undefined = () => undefined,
): AttributeRow[] {
    const needle = filter.trim().toLocaleLowerCase();
    const isResult = (a: AttributeDescriptor): boolean => a.origin === "result";
    return attributes
        .filter((a) => a.kind === kind && a.name.toLocaleLowerCase().includes(needle))
        .sort((a, b) => Number(isResult(b)) - Number(isResult(a)) || a.name.localeCompare(b.name))
        .map((a) => {
            const run = isResult(a) && a.runId !== undefined ? runLabel(a.runId) : undefined;
            const type = isResult(a)
                ? { glyph: "result" as const, typeWord: run === undefined ? "Result of a run" : `Result of ${run}` }
                : typeOf(a.measurement);
            const fill = fillOf(a.completeness);
            return {
                id: `${a.kind}:${a.name}`,
                column: { kind: a.kind, name: a.name },
                name: a.name,
                label: `${a.name}, ${a.kind} attribute`,
                ...type,
                fill,
                description: fill === null ? type.typeWord : `${type.typeWord}, ${fill} have a value`,
            };
        });
}

/**
 * Why an attribute cannot be a label, in words, from the element's coded refusal
 * (`styles.proposeEncoding`).
 * @param refusal - the refusal.
 * @returns one short reason.
 */
export function labelRefusalWords(refusal: CodedFact): string {
    return refusal.code === "E_UNSUPPORTED" && refusal.params.measurement === null
        ? "Has no values"
        : "Cannot be drawn as a label";
}

/**
 * The column an Attributes tree row id names.
 * @param id - `node:<name>` or `edge:<name>`.
 * @returns the column, or null for an id that is not an attribute's.
 */
export function columnOf(id: string): ColumnRef | null {
    const at = id.indexOf(":");
    const kind = at < 0 ? "" : id.slice(0, at);
    return kind === "node" || kind === "edge" ? { kind, name: id.slice(at + 1) } : null;
}
