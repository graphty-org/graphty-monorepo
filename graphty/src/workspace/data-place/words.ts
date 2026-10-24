/**
 * The Data place's words and arrangement (tier1-design.md section 2.6, data prototype spec sections
 * 3.2 and 3.3): what each Sources row, each Attributes row and each Fields row says, in which order.
 * Every fact comes from graphty-element (`data.sources()`, `data.lastImport()`, `data.attributes()`);
 * this file only words and orders it.
 */

import { type AttributeDescriptor, sourceDescriptors } from "@graphty/graphty-element/catalog";
import type {
    CodedFact,
    ColumnRef,
    ColumnRole,
    Endpoint,
    ImportReport,
    LeftOutEdge,
    LoadedSource,
    LocationKind,
    LocationUnused,
    LocationUsing,
    TableMapping,
    TableMappingRead,
} from "@graphty/graphty-element/session";

import { formatNumber, valueText } from "../inspector/words";

/** What a Sources row's glyph shows: a graph file holding both tables, one table, or the rows a load left out. */
export type SourceKind = "file" | "nodes" | "edges" | "left-out";

/** One Sources row. */
export interface SourceRow {
    readonly id: string;
    readonly kind: SourceKind;
    readonly name: string;
    /** The quiet line: "34 nodes, 78 edges"; "30 nodes, 254 edges"; "77 nodes"; a table's "254 rows, 254 edges". */
    readonly quiet: string;
    readonly children?: readonly SourceRow[];
}

/** What an Attributes row's glyph shows: what the column measures, or the run that made it. */
export type TypeGlyph = "category" | "text" | "number" | "ordinal" | "time" | "yes-no" | "unknown" | "result";

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
    /** The row's second line, which a screen reader hears after the name: the type word, then the fill. */
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
 * The row under a load that says how many edge rows it left out, so the count shows however
 * narrow the panel is.
 * @param load - the load, an entry of `data.sources()`.
 * @param id - the load's row id.
 * @returns the rows: one "1 row left out" row, or none when the load left nothing out.
 */
function leftOutRows(load: LoadedSource, id: string): SourceRow[] {
    return load.leftOut === undefined
        ? []
        : [{ id: `${id}:left-out`, kind: "left-out", name: `${count(load.leftOut.rows, "row")} left out`, quiet: "" }];
}

/**
 * The nodes an edge row names that are in no node row: "a node", or "2 nodes".
 * @param values - how many distinct such names.
 * @returns the words.
 */
export function missingNodes(values: number): string {
    return `${values === 1 ? "a node" : count(values, "node")} missing from the node rows`;
}

/**
 * The sentence that says why a load left rows out, for the inspector.
 * @param leftOut - `LoadedSource.leftOut`.
 * @returns such as "1 edge row was left out: it names a node missing from the node rows."
 */
export function leftOutSentence(leftOut: NonNullable<LoadedSource["leftOut"]>): string {
    const one = leftOut.rows === 1;
    return `${count(leftOut.rows, "edge row")} ${one ? "was" : "were"} left out: ${one ? "it names" : "they name"} ${missingNodes(leftOut.values)}.`;
}

/** The words after an unmatched row's end that names no node, in the import grid. */
export const NO_NODE_ROW = "(no node row)";

/**
 * Says which names have no node row: an unmatched row on the import page, a left-out row in the inspector.
 * @param names - the missing names, in row order, repeats allowed.
 * @returns such as "s11 has no node row" or "s11, p13 and 2 more have no node rows".
 */
export function noNodeRow(names: readonly string[]): string {
    const unique = [...new Set(names)];
    const shown = unique.length > 3 ? [...unique.slice(0, 2), `${String(unique.length - 2)} more`] : unique;
    const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1) ?? ""}`;
    return unique.length === 1 ? `${list} has no node row` : `${list} have no node rows`;
}

/**
 * One left-out row as a line: where it was in the file, which of its values has no node row (first,
 * so a narrow inspector still shows it), then its two ends under their column names and its other
 * values under theirs.
 * @param edge - the row, as its load kept it.
 * @param ends - the columns the ends were read from, `LoadedSource.leftOut.endColumns`.
 * @returns such as "Line 24: p13 has no node row; from p11, to p13, emails 6".
 */
export function leftOutRow(edge: LeftOutEdge, ends?: NonNullable<LoadedSource["leftOut"]>["endColumns"]): string {
    const text = (value: unknown): string => (value === null || value === undefined ? "" : valueText(value));
    const named = (name: string | undefined, value: unknown): string =>
        name === undefined ? text(value) : `${name} ${text(value)}`;
    const values = [
        named(ends?.source, edge.source),
        named(ends?.target, edge.target),
        ...Object.entries(edge.values).map(([name, value]) => named(name, value)),
    ].join(", ");
    const missing = (edge.missingEnds ?? []).map((end) => text(edge[end]));
    const line = missing.length === 0 ? values : `${noNodeRow(missing)}; ${values}`;
    return edge.line === undefined ? line : `Line ${String(edge.line)}: ${line}`;
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
        return oneTableRows(only.name ?? "Untitled data", report).map((row) => {
            const leftOut = leftOutRows(only, row.id);
            return leftOut.length === 0 ? row : { ...row, children: [...(row.children ?? []), ...leftOut] };
        });
    }
    return sources.map((load, index) => {
        const id = `source:${String(index)}`;
        const name = loadName(load);
        if (load.tables.length > 1) {
            const children = load.tables.map((table, at): SourceRow => ({
                id: `${id}:${String(at)}`,
                kind: load.tableRows?.[at] ?? "file",
                name: table,
                quiet: "",
            }));
            return {
                id,
                kind: "file",
                name,
                quiet: addedWords(load.added),
                children: [...children, ...leftOutRows(load, id)],
            };
        }
        const leftOut = leftOutRows(load, id);
        return {
            id,
            kind: kindOf(load.added),
            name,
            quiet: addedWords(load.added),
            ...(leftOut.length === 0 ? {} : { children: leftOut }),
        };
    });
}

/**
 * One Sources row by its id, a load's or a child's.
 * @param sources - `data.sources()`.
 * @param report - `data.lastImport()`.
 * @param id - the row's id.
 * @returns the row, or undefined when it is gone.
 */
export function sourceRowOf(
    sources: readonly LoadedSource[],
    report: ImportReport | null,
    id: string,
): SourceRow | undefined {
    return sourceRows(sources, report)
        .flatMap((row) => [row, ...(row.children ?? [])])
        .find((row) => row.id === id);
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
    // A lone table reads what it made: "77 nodes", or "14 nodes, 16 edges" for an edge list.
    const table =
        edgeRecords > 0
            ? { ...edgeTable, quiet: `${count(nodes, "node")}, ${count(edges, "edge")}` }
            : { ...nodeTable, quiet: count(nodes, "node") };
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

/** A yes-or-no column's kind, in the Data place and the attribute inspector. */
export const YES_NO_WORD = "Yes or no";

/** A free-text column's kind (graphty-element's readable kind `text`), in the same places. */
export const TEXT_WORD = "Text";

/**
 * The glyph and its word for what a column holds: a yes-or-no column (graphty-element types it
 * `boolean`), free text (its readable kind is `text`), else what it measures. An absent
 * measurement is a column with no values.
 * @param measurement - `AttributeDescriptor.measurement`.
 * @param type - `AttributeDescriptor.type`.
 * @param readable - the column's kind in `data.readableValues()`, when known.
 * @returns the glyph and its word.
 */
export function typeOf(
    measurement: string | undefined,
    type?: string,
    readable?: string,
): { glyph: TypeGlyph; typeWord: string } {
    if (type === "boolean") {
        return { glyph: "yes-no", typeWord: YES_NO_WORD };
    }
    // Free text is a text column whose values are groups only by inference; a column declared to
    // measure something (a designated time field of text dates) reads as what it measures.
    if (readable === "text" && measurement === "categorical") {
        return { glyph: "text", typeWord: TEXT_WORD };
    }
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
 * @param readable - a column's kind in `data.readableValues()`, by its kind and path.
 * @returns the rows.
 */
export function attributeRows(
    attributes: readonly AttributeDescriptor[],
    kind: "node" | "edge",
    filter = "",
    runLabel: (runId: string) => string | undefined = () => undefined,
    readable: (kind: "node" | "edge", path: string) => string | undefined = () => undefined,
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
                : typeOf(a.measurement, a.type, readable(a.kind, a.path));
            const fill = fillOf(a.completeness);
            return {
                id: `${a.kind}:${a.name}`,
                column: { kind: a.kind, name: a.name },
                name: a.name,
                label: `${a.name}, ${a.kind} attribute`,
                ...type,
                fill,
                // Every row says its type and how many have a value: "Text, all have a value".
                description: a.completeness <= 0 ? type.typeWord : `${type.typeWord}, ${fill ?? "all"} have a value`,
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

/** What a load is called when the reader gave it no name and its source has none. */
const KIND_NAMES: Readonly<Record<LoadedSource["kind"], string>> = {
    file: "File",
    server: "Server",
    sample: "Sample",
    join: "Joined table",
};

/**
 * A Sources row's name: the reader's name for the load, else its network source's catalog name,
 * else a word for its kind -- never the internal key.
 * @param source - the load.
 * @returns the name.
 */
export function sourceName(source: LoadedSource): string {
    if (source.name !== undefined && source.name !== "") {
        return source.name;
    }
    const id = source.type?.replace(/^source:/, "");
    return sourceDescriptors().find((each) => each.id === id)?.descriptor.plainName ?? KIND_NAMES[source.kind];
}

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
export type FieldKey =
    "key" | "label" | "kind" | "time" | "source" | "target" | "weight" | "edgeId" | "sourceKind" | "targetKind";

/** One fixed structure row: it always holds a value, so it is never a "+" entry. */
export interface FieldRow {
    readonly key: FieldKey;
    readonly side: FieldSide;
    /** The row's label, such as "Source". */
    readonly label: string;
}

/** The fixed structure rows of each side, read when the rows load (`data.reloadSource`). */
export const FIELD_ROWS: readonly FieldRow[] = [
    { key: "key", side: "nodes", label: "Id" },
    { key: "source", side: "edges", label: "Source" },
    { key: "target", side: "edges", label: "Target" },
];

/** What a Fields "+" entry is. */
export type EntryId = "label" | "kind" | "weight" | "time" | LocationKind | "edgeId" | "sourceKind" | "targetKind";

/** One kind of Fields "+" entry. */
export interface FieldEntry {
    readonly id: EntryId;
    /** Its name in the list and in "+", such as "Time". */
    readonly name: string;
    /** The role the element gives its column in place (`data.setRole`), when it has one. */
    readonly role?: ColumnRole;
    /** The load-time role it reads the load again with (`data.reloadSource`), when it is one. */
    readonly load?: FieldKey;
}

/** The node location entries, one per kind, as the element names the kinds (`ColumnRole`). */
export const LOCATION_ENTRIES = [
    { id: "latitude", name: "Latitude", role: "latitude" },
    { id: "longitude", name: "Longitude", role: "longitude" },
    { id: "coordinates", name: "Coordinates", role: "coordinates" },
    { id: "country", name: "Country", role: "country" },
    { id: "region", name: "Region", role: "region" },
    { id: "city", name: "City", role: "city" },
] as const satisfies readonly FieldEntry[];

/** The kinds each side's "+" offers, in list order. */
export const FIELD_ENTRIES: Readonly<Record<FieldSide, readonly FieldEntry[]>> = {
    nodes: [
        { id: "label", name: "Label", role: "label" },
        { id: "kind", name: "Kind", load: "kind" },
        { id: "weight", name: "Weight", role: "weight" },
        { id: "time", name: "Time", role: "time" },
        ...LOCATION_ENTRIES,
    ],
    edges: [
        { id: "weight", name: "Weight", role: "weight" },
        { id: "time", name: "Time", role: "time" },
        { id: "kind", name: "Kind", load: "kind" },
        { id: "edgeId", name: "Id", load: "edgeId" },
        { id: "sourceKind", name: "Kind of source", load: "sourceKind" },
        { id: "targetKind", name: "Kind of target", load: "targetKind" },
    ],
};

/** The entries a location is read from, by what the element reads (`LocationUsing`). */
const USING_ENTRIES: Readonly<Record<LocationUsing, string>> = {
    pair: "Latitude and Longitude",
    coordinates: "Coordinates",
    country: "Country",
    region: "Region",
    city: "City",
};

/**
 * The words for a listed location kind the element does not read (`location.unused`).
 * @param fact - The element's fact.
 * @returns Such as "Not used: the location comes from City".
 */
export function unusedWords(fact: LocationUnused): string {
    return `Not used: the location comes from ${USING_ENTRIES[fact.params.using]}`;
}

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
export function loadValue(roles: TableMappingRead | undefined, key: FieldKey | ColumnRole): string | null {
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
