/**
 * @file A load read before it happens: `session.data.prepare()` and the `LoadDraft` it returns.
 *
 * The source is read ONCE and its rows held. `report()` runs the session's own ingest over the
 * held rows in a scratch session, and `load()` hands the same rows to this session's ingest, so
 * what the draft reports and what the load does cannot disagree, and neither reads the source
 * again.
 */

import { unknownFormat } from "../catalog/detect";
import type { NodeId } from "../catalog/types";
import { CSVDataSource, readGephiTypeColumn } from "../data/CSVDataSource";
import { DataSource, type DeclaredDirection } from "../data/DataSource";
import { readEndpoint, resolveEndpoints } from "../data/endpoints";
import type { DataLoadingError } from "../data/ErrorAggregator";
import type { LoadReport } from "../data/report";
import { readSource as sourceBytes } from "../data/source-bytes";
import { GraphtyError } from "../errors";
import { describeRows } from "./attributes";
import { resolveColumn } from "./columns";
import type { BatchCommand } from "./commands";
import { type DataImportCommand, type HeldRows, importCommand, type ImportSource } from "./commands/data";
import { type JoinGraph, joinReport, type JoinTable, suggestJoin } from "./join";
import { HELD_KINDS, isStorableId, unreadableSource, untilAborted } from "./project/ingest";
import { documentKind } from "./projectFile";
import { HELD_READERS } from "./styles/fileStyles/apply";
import type {
    ColumnRole,
    DraftColumn,
    DraftRow,
    DraftRowFilter,
    DraftRowOptions,
    DraftTable,
    EdgeEnd,
    Endpoint,
    JoinChoices,
    JoinReport,
    JoinShape,
    JoinSuggestion,
    LoadChoices,
    LoadDraft,
    LoadMapping,
    LoadMappingRead,
    ProjectConfigPatch,
    RecordPage,
    SessionDataConfig,
    TableMapping,
    TableMappingRead,
} from "./types";

/** Dispatches a command as the session's next step. */
type DraftSend = (command: DataImportCommand | BatchCommand) => Promise<unknown>;

/** What a draft needs from the session it loads into. */
interface DraftHost {
    /** The data configuration now. */
    config(): SessionDataConfig;
    /** The node ids the graph holds, its edge count and its edges' endpoint pairs, for a merge. */
    graph(): NonNullable<DataImportCommand["measure"]>;
    /**
     * Runs a load in the session's load line: `run` gets the dispatch, taken synchronously, which
     * sends its command once every load asked for earlier has dispatched (issue #3382).
     */
    inLine(run: (send: DraftSend) => Promise<void>): Promise<void>;
    /** Runs an import in a scratch session with this configuration and returns its report. */
    measure(command: DataImportCommand, config: SessionDataConfig): Promise<LoadReport>;
    /** The draft has been disposed. */
    released(draft: Draft): void;
    /** For a draft prepared `onto: "graph"`: the graph as a join reads it. */
    joinGraph?(): JoinGraph;
    /**
     * For a draft prepared `onto: "graph"`: taken synchronously, as `importer` is; joins a table
     * onto the graph as one step.
     */
    joiner?(): (table: JoinedTable, choices: JoinChoices, shape: JoinShape) => Promise<void>;
}

/** A table to join, with the source it was read from. */
export interface JoinedTable extends JoinTable {
    /** The source, as `data.sources()` describes it. */
    readonly source: ImportSource;
}

/** One table as the draft holds it. */
interface HeldTable {
    readonly table: DraftTable;
    readonly rows: readonly Readonly<Record<string, unknown>>[];
    /** Each row's line in the file, or null when the format gives none. */
    readonly lines: readonly number[] | null;
    /** The header's names, in order. */
    readonly order: readonly string[];
}

/** What reading a source produced. */
export interface ReadSource {
    readonly source: ImportSource;
    /** The data source that read it, which says what styles the file carries. */
    readonly reader: DataSource;
    readonly tables: readonly HeldTable[];
    readonly declaredDirection: DeclaredDirection | null;
    readonly errors: readonly DataLoadingError[];
    readonly errorLimit: number;
    /** The kind of graphty document the source is, when it is one rather than data. */
    readonly graphtyDocument?: "project" | "document";
}

/**
 * The column roles a table of each kind takes (`takes`), and the ones a load cannot do without
 * (`requires`). A node table needs no role: without a `key` its rows are numbered. An edge table
 * needs both ends. Plain data, safe to import in Node.
 */
export const LOAD_ROLES: Readonly<
    Record<"nodes" | "edges", { readonly takes: readonly ColumnRole[]; readonly requires: readonly ColumnRole[] }>
> = Object.freeze({
    nodes: Object.freeze({
        takes: Object.freeze(["key", "label", "time", "kind"] as const),
        requires: Object.freeze([]),
    }),
    edges: Object.freeze({
        takes: Object.freeze(["source", "target", "weight", "time", "edgeId", "kind"] as const),
        requires: Object.freeze(["source", "target"] as const),
    }),
});

/** An edge's two ends, in the order its endpoint expressions are read. */
const EDGE_ENDS: readonly EdgeEnd[] = ["source", "target"];

/** The keys a table's mapping takes: `rowsAre` and its roles. */
const ROLES: Readonly<Record<"nodes" | "edges", ReadonlySet<string>>> = {
    nodes: new Set(["rowsAre", ...LOAD_ROLES.nodes.takes]),
    edges: new Set(["rowsAre", ...LOAD_ROLES.edges.takes, "sourceKind", "targetKind"]),
};

/** The choices a load keeps with it, for `data.reloadSource` to read the rows again the same way. */
const KEPT_CHOICES = ["mapping", "unmatched", "duplicateIds", "kindIds", "directed"] as const;

/**
 * The choices a load keeps, as `{ choices }`, or nothing when it was given none.
 * @param choices - What the load was given.
 * @returns `{ choices }` or `{}`.
 */
function keptChoices(choices: LoadChoices): { choices?: LoadChoices } {
    const kept: Record<string, unknown> = {};
    for (const name of KEPT_CHOICES) {
        if (choices[name] !== undefined) {
            kept[name] = choices[name];
        }
    }

    return Object.keys(kept).length === 0 ? {} : { choices: Object.freeze(kept) };
}

/** The attribute a row's kind loads as. */
const KIND = "kind";

/** The endpoint column pairs a CSV edge table is probed for, as the CSV reader probes them. */
const ENDPOINT_PAIRS: readonly (readonly [string, string])[] = [
    ["source", "target"],
    ["src", "dst"],
    ["from", "to"],
];

/** The header names that make a single CSV file a node list, and name its key. */
const NODE_ID_COLUMNS: readonly string[] = ["id", "Id", "ID"];

/** The record key every graph file format's reader gives a node's label. */
const FORMAT_LABEL = "label";

/** The id a row-numbered node is given, as the CSV reader numbers them. */
const ROW_ID = "id";

/**
 * A refusal of a choice the draft cannot carry out.
 * @param message - What is wrong.
 * @param details - The facts.
 * @returns The error.
 */
function badCommand(message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", source: "data", message, details });
}

/**
 * The JMESPath expression reading one record key, quoted unless it is a bare identifier, so a
 * column called "from station", "a.b" or "2024" reads as itself.
 * @param name - The key.
 * @returns The expression.
 */
export function keyExpression(name: string): string {
    return /^[A-Za-z_]\w*$/.test(name) ? name : JSON.stringify(name);
}

/**
 * The name of one file of a pair: the `File`'s name, or the URL's last part.
 * @param value - A `nodeFile`, `edgeFile`, `nodeURL` or `edgeURL` option.
 * @returns The name, or undefined.
 */
export function fileName(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value.split(/[?#]/)[0]?.split("/").pop();
    }

    const named = (value as { name?: unknown } | null | undefined)?.name;
    return typeof named === "string" ? named : undefined;
}

/**
 * A held table, its columns described.
 * @param id - Its id.
 * @param name - Its name.
 * @param fixed - Whether the format sets its roles.
 * @param rows - Its rows.
 * @param lines - Each row's line, or null.
 * @param order - Its header.
 * @param delimiter - A CSV file's column separator, and whether it was detected.
 * @returns The table.
 */
function heldTable(
    id: string,
    name: string,
    fixed: boolean,
    rows: readonly Record<string, unknown>[],
    lines: readonly number[] | null,
    order: readonly string[] = [],
    delimiter?: DraftTable["delimiter"],
): HeldTable {
    for (const row of rows) {
        Object.freeze(row);
    }

    const columns = describeRows(rows, id === "nodes" ? "node" : "edge", order).map(
        ({ name: column, type, completeness, uniqueCount, sampleValues }): DraftColumn => ({
            name: column,
            type,
            completeness,
            ...(uniqueCount === undefined ? {} : { uniqueCount }),
            sampleValues,
        }),
    );
    return {
        table: {
            id,
            name,
            rowCount: rows.length,
            fixed,
            columns,
            ...(delimiter === undefined ? {} : { delimiter: Object.freeze({ ...delimiter }) }),
        },
        rows,
        lines,
        order: columns.map((column) => column.name),
    };
}

/**
 * The rows a reader refused, as plain data a command can carry.
 * @param reader - The reader, after reading.
 * @returns The refusals and the limit.
 */
function errorsOf(reader: DataSource): Pick<ReadSource, "errors" | "errorLimit"> {
    const aggregator = reader.getErrorAggregator();
    return { errors: aggregator.getErrors(), errorLimit: aggregator.getErrorLimit() };
}

/**
 * Read a source once, holding its rows.
 * @param source - The source, its format settled.
 * @param signal - Abandons the read.
 * @param progress - Told the rows read so far, after each table or chunk, and, for a CSV file,
 *     the share of its text read.
 * @returns What it holds.
 * @throws What the source's reader throws, with its code.
 */
export async function readSource(
    source: ImportSource,
    signal?: AbortSignal,
    progress: (rows: number, fraction?: number) => void = () => undefined,
): Promise<ReadSource> {
    const type = source.type ?? "";
    const config = source.config ?? {};
    const reader = DataSource.get(type, config);
    if (reader === null) {
        throw unknownFormat(type);
    }

    const named = source.name ?? type;
    const rowTables = reader instanceof CSVDataSource ? await reader.readRows(progress) : null;
    signal?.throwIfAborted();
    if (rowTables !== null) {
        const pairNames: Readonly<Record<string, string | undefined>> = {
            nodes: fileName(config.nodeFile ?? config.nodeURL),
            edges: fileName(config.edgeFile ?? config.edgeURL),
        };
        const tables = Object.entries(rowTables).map(([id, read]) =>
            heldTable(id, pairNames[id] ?? named, false, read.rows, read.lines, read.columns, read.delimiter),
        );
        progress(
            tables.reduce((sum, held) => sum + held.rows.length, 0),
            1,
        );
        return { source, reader, tables, declaredDirection: null, ...errorsOf(reader) };
    }

    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of untilAborted(reader.getData(), signal)) {
        // A loop rather than a spread: a spread of a large chunk overflows the call stack.
        for (const node of chunk.nodes) {
            nodes.push(node);
        }

        for (const edge of chunk.edges) {
            edges.push(edge);
        }

        progress(nodes.length + edges.length);
    }

    // Refused now, as the load would refuse it, rather than held as two empty tables.
    const unreadable = nodes.length + edges.length === 0 ? unreadableSource(type, errorsOf(reader).errors) : null;
    if (unreadable !== null) {
        throw unreadable;
    }

    // A source that read as no rows at all may be a graphty document -- a saved project, style
    // or notes -- which `project.open` opens and which holds no rows a data reader finds.
    const graphtyDocument = nodes.length + edges.length === 0 ? await graphtyDocumentOf(config) : null;
    return {
        source,
        reader,
        tables: [heldTable("nodes", named, true, nodes, null), heldTable("edges", named, true, edges, null)],
        declaredDirection: reader.declaredDirection,
        ...errorsOf(reader),
        ...(graphtyDocument === null ? {} : { graphtyDocument }),
    };
}

/**
 * Whether a source's bytes are a graphty document, as `project.open` reads one.
 * @param config - The source's options: inline `data`, a `file` or a `url`.
 * @returns The document's kind, or null for anything else, or a source that cannot be read again.
 */
async function graphtyDocumentOf(config: Readonly<Record<string, unknown>>): Promise<"project" | "document" | null> {
    try {
        const input = await sourceBytes(config);
        if (input === null) {
            return null;
        }
        return documentKind(typeof input === "string" ? input : new TextDecoder().decode(input));
    } catch {
        return null;
    }
}

/**
 * Whether a source's file carries styles, and how many rules they hold.
 * @param read - What reading the source produced.
 * @param signal - Abandons the reading.
 * @returns The facts, or null when the file carries none.
 */
export async function draftStyles(read: ReadSource, signal?: AbortSignal): Promise<LoadDraft["styles"]> {
    const styles = await read.reader.fileStyles(signal === undefined ? {} : { signal });
    if (styles === null) {
        return null;
    }

    const { rules, source } = styles.extracted.styles;
    return Object.freeze({
        declared: rules.length > 0,
        summary: Object.freeze({
            nodeRules: rules.filter((rule) => rule.target === "node").length,
            edgeRules: rules.filter((rule) => rule.target === "edge").length,
            tool: source.tool,
        }),
    });
}

/** How a draft guesses roles: from the header's names only, or from the values too. */
type DraftGuess = "names" | "values";

/**
 * How much of the smaller of two text columns' values the other must also hold for the two to
 * read as an edge's ends when no header names them (`bait` and `prey` name the same proteins).
 */
const SHARED_ENDS = 0.5;

/** How nearly every value of a text column must be its own for it to read as a node table's key. */
const NEARLY_UNIQUE = 0.95;

/** The fewest distinct values a column names for its repeats to read as an event's end. */
const REPEATING_MIN = 3;

/** Column names whose numbers measure how alike or how strongly tied two ends are. */
const SIMILARITY_COLUMNS: ReadonlySet<string> = new Set(["confidence", "score", "strength"]);

/** Column names a node's label is read from when no label path is configured. */
export const LABEL_COLUMNS: readonly string[] = ["label", "Label", "name", "Name", "title", "Title"];

/** A value that starts with a calendar date, which reads as a time, never as an id. */
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

/**
 * The distinct values of each text or category column of a table, for the guesses that read values.
 * @param held - The table.
 * @returns By column name, its distinct non-blank text values.
 */
function textValues(held: HeldTable): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>();
    for (const column of held.table.columns) {
        if (column.type === "string" || column.type === "category") {
            out.set(column.name, new Set());
        }
    }

    for (const row of held.rows) {
        for (const [name, values] of out) {
            const value = row[name];
            if (typeof value === "string" && value !== "") {
                values.add(value);
            }
        }
    }

    for (const [name, values] of out) {
        if (values.size > 0 && [...values].every((value) => DATE_LIKE.test(value))) {
            out.delete(name);
        }
    }

    return out;
}

/**
 * How much of the smaller of two sets of values the other also holds.
 * @param a - One column's values.
 * @param b - The other's.
 * @returns The share, from 0 to 1; 0 when either is empty or absent.
 */
function shareOf(a: ReadonlySet<string> | undefined, b: ReadonlySet<string> | undefined): number {
    if (a === undefined || b === undefined || a.size === 0 || b.size === 0) {
        return 0;
    }

    const [small, big] = a.size <= b.size ? [a, b] : [b, a];
    let common = 0;
    for (const value of small) {
        if (big.has(value)) {
            common++;
        }
    }

    return common / small.size;
}

/**
 * The two text columns whose values most name the same things, read as an edge table's ends when
 * no header names them: the earlier column is the source.
 * @param values - Each text column's distinct values.
 * @returns The pair, or undefined when no two columns share enough.
 */
function sharedEnds(values: ReadonlyMap<string, ReadonlySet<string>>): readonly [string, string] | undefined {
    const names = [...values.keys()];
    let best: readonly [string, string] | undefined;
    let bestShare = 0;
    for (let first = 0; first < names.length; first++) {
        for (let second = first + 1; second < names.length; second++) {
            const share = shareOf(values.get(names[first]), values.get(names[second]));
            if (share >= SHARED_ENDS && share > bestShare) {
                best = [names[first], names[second]];
                bestShare = share;
            }
        }
    }

    return best;
}

/**
 * The first two text columns whose values repeat, read as an event table's ends when no two
 * columns name the same things (`user` and `host` of an access log): each names a few things many
 * times over, more than a yes/no column does.
 * @param held - The table.
 * @param values - Each text column's distinct values.
 * @returns The pair, the earlier column the source, or undefined.
 */
function repeatingEnds(
    held: HeldTable,
    values: ReadonlyMap<string, ReadonlySet<string>>,
): readonly [string, string] | undefined {
    const repeating = [...values]
        .filter(([, distinct]) => distinct.size >= REPEATING_MIN && distinct.size <= held.rows.length / 2)
        .map(([name]) => name);
    return repeating.length >= 2 ? [repeating[0], repeating[1]] : undefined;
}

/**
 * The numeric column an edge table's weight is most likely read from, when no header names one:
 * a confidence, score or strength, else the one numeric column it has.
 * @param held - The table.
 * @param ends - The source and target columns, which are never the weight.
 * @returns The column, or null.
 */
function guessedWeight(held: HeldTable, ends: readonly string[] | undefined): string | null {
    const numeric = held.table.columns
        .filter((column) => (column.type === "number" || column.type === "integer") && !ends?.includes(column.name))
        .map((column) => column.name);
    const named = numeric.find((name) => SIMILARITY_COLUMNS.has(name.toLowerCase()));
    return named ?? (numeric.length === 1 ? numeric[0] : null);
}

/**
 * The first complete text column whose values are nearly all distinct, read as a node table's key
 * when no header names one (`account`, `symbol`).
 * @param held - The table.
 * @param values - Each text column's distinct values.
 * @returns The column, or undefined.
 */
function nearlyUniqueKey(held: HeldTable, values: ReadonlyMap<string, ReadonlySet<string>>): string | undefined {
    return held.table.columns.find(
        (column) =>
            column.completeness === 1 && (values.get(column.name)?.size ?? 0) >= NEARLY_UNIQUE * held.rows.length,
    )?.name;
}

/**
 * The element's own reading of one table.
 * @param held - The table.
 * @param rowsAre - What its rows are, when already decided.
 * @param source - The source's options, for the deprecated CSV column aliases.
 * @param config - The data configuration.
 * @param guess - `"values"` also reads the values when no header names the roles.
 * @returns The table's roles.
 */
function guessTable(
    held: HeldTable,
    rowsAre: "nodes" | "edges" | undefined,
    source: Readonly<Record<string, unknown>>,
    config: SessionDataConfig,
    guess: DraftGuess = "names",
): TableMappingRead {
    const { knownFields } = config;
    const has = (name: unknown): name is string => typeof name === "string" && held.order.includes(name);
    const present = (name: string | null): string | null => (has(name) ? name : null);

    if (held.table.fixed) {
        return guessFixed(held, config);
    }

    // The deprecated CSV options name columns; they translate into the mapping.
    const aliasSource = typeof source.edgeSource === "string" ? source.edgeSource : undefined;
    const aliasTarget = typeof source.edgeTarget === "string" ? source.edgeTarget : undefined;
    const named: readonly [string, string] | undefined =
        aliasSource !== undefined && aliasTarget !== undefined
            ? [aliasSource, aliasTarget]
            : [...(source.variant === "gephi" ? [["Source", "Target"] as const] : []), ...ENDPOINT_PAIRS].find(
                  ([from, to]) => has(from) && has(to),
              );
    const namedId = has(source.idColumn) ? source.idColumn : NODE_ID_COLUMNS.find(has);
    // No header says what the rows are: read the values. Two columns naming the same things are an
    // edge's ends; else a single file's nearly unique text column is its nodes' key.
    const values =
        guess === "values" && named === undefined && namedId === undefined && held.table.id !== "nodes"
            ? textValues(held)
            : null;
    const shared = named ?? (values === null ? undefined : sharedEnds(values));
    const uniqueKey =
        values !== null && shared === undefined && held.table.id === "rows" ? nearlyUniqueKey(held, values) : undefined;
    const pair = shared ?? (values === null || uniqueKey !== undefined ? undefined : repeatingEnds(held, values));
    const idColumn = namedId ?? (pair === undefined ? uniqueKey : undefined);
    const readsAsNodes = source.variant === "node-list" || (pair === undefined && idColumn !== undefined);
    const ownKind: "nodes" | "edges" = readsAsNodes ? "nodes" : "edges";
    // One file of a pair says what it holds by its columns, whichever half it was handed over as;
    // only a file whose columns say nothing is read as the half it was handed over as.
    const decided = held.table.id === "rows" || pair !== undefined || idColumn !== undefined;
    const kind = rowsAre ?? (decided ? ownKind : (held.table.id as "nodes" | "edges"));

    if (kind === "nodes") {
        // A pair's node file falls back to its first column, as the CSV reader does.
        const key = idColumn ?? (held.table.id === "rows" ? undefined : held.order[0]) ?? null;
        return {
            rowsAre: "nodes",
            key,
            label:
                present(knownFields.nodeLabelPath) ??
                (guess === "values" ? (LABEL_COLUMNS.find((name) => has(name) && name !== key) ?? null) : null),
            time: present(knownFields.nodeTimePath),
        };
    }

    const weight =
        present(knownFields.edgeWeightPath) ??
        present("value") ??
        (guess === "values" ? guessedWeight(held, pair) : null);
    return {
        rowsAre: "edges",
        ...(pair === undefined ? {} : { source: { column: pair[0] }, target: { column: pair[1] } }),
        weight,
        time: present(knownFields.edgeTimePath),
        edgeId: present(knownFields.edgeIdPath),
    };
}

/**
 * The roles a format sets, read the way the ingest will read them.
 * @param held - A table of a graph file.
 * @param config - The data configuration.
 * @returns The table's roles.
 */
function guessFixed(held: HeldTable, config: SessionDataConfig): TableMappingRead {
    const { knownFields } = config;
    const present = (name: string | null): string | null => (name !== null && held.order.includes(name) ? name : null);
    if (held.table.id === "nodes") {
        return {
            rowsAre: "nodes",
            key: knownFields.nodeIdPath,
            // Every graph format's reader names a node's label `label`; a configured path wins.
            label: present(knownFields.nodeLabelPath ?? FORMAT_LABEL),
            time: present(knownFields.nodeTimePath),
        };
    }

    let endpoints: TableMappingRead = { rowsAre: "edges" };
    try {
        const resolved = resolveEndpoints(held.rows, {
            source: knownFields.edgeSrcIdPath,
            target: knownFields.edgeDstIdPath,
        });
        endpoints = { rowsAre: "edges", source: { column: resolved.source }, target: { column: resolved.target } };
    } catch {
        // No spelling answers: the load refuses with E_EDGE_ENDPOINTS_UNRESOLVED, and says so then.
    }

    return {
        ...endpoints,
        weight: present(knownFields.edgeWeightPath) ?? present("value"),
        time: present(knownFields.edgeTimePath),
        edgeId: present(knownFields.edgeIdPath),
    };
}

/** What one set of choices loads, and what it writes to the configuration beside the rows. */
interface Plan {
    readonly mapping: LoadMappingRead;
    readonly held: HeldRows;
    readonly knownFields: NonNullable<NonNullable<ProjectConfigPatch["data"]>["knownFields"]>;
    /** How many of `held.nodes` were made for an edge table's ends, not read from a node row. */
    readonly endpointNodes: number;
}

/** A source read and held: the {@link LoadDraft} `session.data.prepare()` returns. */
export class Draft implements LoadDraft {
    readonly type: string;
    readonly tables: readonly DraftTable[];
    readonly mapping: LoadMappingRead;
    readonly graphtyDocument?: "project" | "document";
    readonly styles: LoadDraft["styles"];

    private read: ReadSource | null;
    private readonly host: DraftHost;
    /** `suggestJoin()`'s answer, read once. */
    private suggestion: JoinSuggestion | null = null;

    /**
     * Hold what was read.
     * @param read - The source's rows.
     * @param host - The session.
     * @param styles - Whether the file carries styles; see {@link draftStyles}.
     * @param guess - How the roles are guessed; see `data.prepare`'s `guess` option.
     */
    constructor(
        read: ReadSource,
        host: DraftHost,
        styles: LoadDraft["styles"] = null,
        private readonly guess: DraftGuess = "names",
    ) {
        this.read = read;
        this.host = host;
        this.styles = styles;
        this.type = read.source.type ?? "";
        if (read.graphtyDocument !== undefined) {
            this.graphtyDocument = read.graphtyDocument;
        }
        this.tables = Object.freeze(read.tables.map((held) => Object.freeze(held.table)));
        const config = host.config();
        const options = read.source.config ?? {};
        let guesses = read.tables.map((held) => guessTable(held, undefined, options, config, guess));
        if (guesses.length === 2 && guesses[0].rowsAre === guesses[1].rowsAre) {
            // Both files of a pair read as the same kind: the order they were handed over in decides.
            guesses = read.tables.map((held) =>
                guessTable(held, held.table.id as "nodes" | "edges", options, config, guess),
            );
        }

        const tables = Object.fromEntries(read.tables.map((held, at) => [held.table.id, Object.freeze(guesses[at])]));
        this.mapping = Object.freeze({ tables: Object.freeze(tables) });
        this.tables = Object.freeze(
            read.tables.map((held) => {
                const roles = suggestedRoles(this.mapping.tables[held.table.id]);
                const own = this.mapping.tables[held.table.id];
                const weightCandidate = weightCandidateOf(
                    held,
                    own.rowsAre === "edges" ? own : guessTable(held, "edges", read.source.config ?? {}, config),
                );
                return Object.freeze({
                    ...held.table,
                    ...(weightCandidate === undefined ? {} : { weightCandidate }),
                    columns: Object.freeze(
                        held.table.columns.map((column) => {
                            const suggested = roles.get(column.name);
                            return Object.freeze(suggested === undefined ? column : { ...column, suggested });
                        }),
                    ),
                });
            }),
        );
    }

    /**
     * Every table's roles as a load with these choices reads them.
     * @param choices - The same choices `report` and `load` take.
     * @returns The roles.
     */
    resolve(choices: LoadChoices = {}): LoadMappingRead {
        return this.effective(this.live("resolve"), choices.mapping);
    }

    /**
     * The roles each table needs and does not have under a set of choices.
     * @param choices - The same choices `report` and `load` take.
     * @returns By table id, the required roles left unset; an empty list means ready.
     */
    missing(choices: LoadChoices = {}): Readonly<Record<string, readonly ColumnRole[]>> {
        const read = this.live("missing");
        return missingRoles(this.effective(read, choices.mapping));
    }

    /**
     * What `load(choices)` would do to the graph as it is now.
     * @param choices - The same choices `load` takes.
     * @returns The report.
     */
    async report(choices: LoadChoices = {}): Promise<LoadReport> {
        const read = this.live("report");
        const plan = this.plan(read, choices);
        const merging = choices.mode === "merge";
        const config = this.host.config();
        const report = await this.host.measure(
            {
                op: "data.import",
                source: read.source,
                mode: merging ? "merge" : "replace",
                held: plan.held,
                ...(choices.unmatched === undefined ? {} : { unmatched: choices.unmatched }),
                ...(choices.duplicateIds === undefined ? {} : { duplicateIds: choices.duplicateIds }),
                measure: merging ? this.host.graph() : { nodes: new Set(), edges: 0 },
            },
            {
                ...config,
                ...(choices.directed === undefined ? {} : { directed: choices.directed }),
                knownFields: { ...config.knownFields, ...plan.knownFields },
            },
        );
        // The node rows made for an edge table's ends are not rows the source held.
        return plan.endpointNodes === 0
            ? report
            : {
                  ...report,
                  counts: {
                      ...report.counts,
                      nodeRecords: Math.max(0, report.counts.nodeRecords - plan.endpointNodes),
                  },
              };
    }

    /**
     * The table's rows, a page at a time.
     * @param table - A table id.
     * @param options - The page, and which rows.
     * @returns The page.
     */
    rows(table: string, options: DraftRowOptions = {}): Promise<RecordPage<DraftRow>> {
        // Settled later, so a disposed draft or an unknown table rejects rather than throws.
        return Promise.resolve().then(() => this.page(table, options));
    }

    /**
     * One page of a table's rows.
     * @param table - A table id.
     * @param options - The page, and which rows.
     * @returns The page.
     */
    private page(table: string, options: DraftRowOptions): RecordPage<DraftRow> {
        const read = this.live("rows");
        const held = this.table(read, table);
        const { offset = 0, limit = 100, only, choices = {} } = options;
        const missing = new Map<number, readonly EdgeEnd[]>();
        const picked = only === undefined ? null : this.filter(read, held, only, choices, missing);
        const total = picked?.length ?? held.rows.length;
        const records: DraftRow[] = [];
        for (let i = offset; i < Math.min(total, offset + limit); i++) {
            const index = picked?.[i] ?? i;
            const missingEnds = only === "unmatched" ? missing.get(index) : undefined;
            records.push(
                Object.freeze({
                    line: held.lines?.[index] ?? index + 1,
                    values: held.rows[index],
                    ...(missingEnds === undefined ? {} : { missingEnds }),
                }),
            );
        }

        return Object.freeze({ records: Object.freeze(records), offset, total, revision: "draft" });
    }

    /**
     * Load the held rows as one undoable step, or as where the history starts
     * (`history: "start"`).
     * @param choices - The column roles and the rest.
     * @returns Settles once the rows are in the graph.
     */
    async load(choices: LoadChoices = {}): Promise<void> {
        if (choices.join !== undefined) {
            // Taken before the first await, as the importer is.
            const join = this.joinHost("load").joiner?.();
            const { table, shape } = this.joinTable("load", choices.join);
            await join?.(table, choices.join, shape);
            this.dispose();
            return;
        }

        await this.host.inLine((send) => this.loadVia(send, choices));
    }

    /**
     * How the table most likely joins onto the graph.
     * @returns The suggestion.
     */
    suggestJoin(): JoinSuggestion {
        const host = this.joinHost("suggestJoin");
        const read = this.live("suggestJoin");
        if (this.suggestion === null) {
            const held = joinedHeld(read);
            const roles = this.mapping.tables[held.table.id];
            const endpoints =
                roles.source === undefined || roles.target === undefined
                    ? undefined
                    : { source: roles.source.column, target: roles.target.column };
            this.suggestion = suggestJoin(tableOf(read, held), host.joinGraph?.() ?? NO_GRAPH, endpoints);
        }

        return this.suggestion;
    }

    /**
     * What `load({ join: choices })` would do, counted.
     * @param choices - The join.
     * @returns The counts.
     */
    joinReport(choices: JoinChoices): JoinReport {
        const host = this.joinHost("joinReport");
        const { table, shape } = this.joinTable("joinReport", choices);
        return joinReport(table, host.joinGraph?.() ?? NO_GRAPH, choices, shape);
    }

    /**
     * The host's join half, or a refusal for a draft not prepared onto the graph.
     * @param verb - The method asked.
     * @returns The host.
     */
    private joinHost(verb: string): DraftHost {
        this.live(verb);
        if (this.host.joinGraph === undefined) {
            throw badCommand(`draft.${verb}() joins onto the graph: prepare the source with { onto: "graph" }.`, {
                reason: "not-onto-graph",
                verb,
            });
        }

        return this.host;
    }

    /**
     * The table a join reads, and its shape when the choices give none.
     * @param verb - The method asked.
     * @param choices - The join.
     * @returns The table and the shape.
     */
    private joinTable(verb: string, choices: JoinChoices): { table: JoinedTable; shape: JoinShape } {
        const read = this.live(verb);
        const shape = choices.shape ?? this.suggestJoin().shape;
        return { table: tableOf(read, joinedHeld(read)), shape };
    }

    /**
     * Load through a dispatch taken earlier, as `import` takes it before its first await.
     * @param send - The dispatch.
     * @param choices - The column roles and the rest.
     * @returns Settles once the rows are in the graph.
     */
    async loadVia(send: DraftSend, choices: LoadChoices = {}): Promise<void> {
        const read = this.live("load");
        const plan = this.plan(read, choices);
        // One entry per table name, the first table of a name giving what it held.
        const named = new Map<string, "nodes" | "edges">();
        for (const held of read.tables) {
            if (!named.has(held.table.name)) {
                named.set(held.table.name, plan.mapping.tables[held.table.id].rowsAre);
            }
        }
        const starts = choices.history === "start" ? { startsHistory: true } : {};
        const command: DataImportCommand = {
            ...importCommand(read.source, choices, plan.held),
            tables: [...named.keys()],
            // A graph file's one name holds both kinds, so it says nothing of what it held.
            ...(read.tables.every((held) => held.table.fixed) ? {} : { tableRows: [...named.values()] }),
            ...keptChoices(choices),
            // A graph file's tables are the format's own, so only a table's roles are worth keeping.
            ...(read.tables.every((held) => held.table.fixed) ? {} : { mapping: plan.mapping }),
            ...starts,
        };
        const data = {
            ...(choices.directed === undefined ? {} : { directed: choices.directed }),
            ...(Object.keys(plan.knownFields).length === 0 ? {} : { knownFields: plan.knownFields }),
        };
        await send(
            Object.keys(data).length === 0
                ? command
                : { op: "batch", steps: [{ op: "config.set", values: { data } }, command], ...starts },
        );
        this.dispose();
    }

    /** Let go of the held rows. */
    dispose(): void {
        if (this.read !== null) {
            this.read = null;
            this.host.released(this);
        }
    }

    /**
     * The held rows, or a refusal once the draft is disposed.
     * @param verb - The method asked.
     * @returns The rows.
     */
    private live(verb: string): ReadSource {
        if (this.read === null) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                source: "data",
                message: `the load draft has been loaded or disposed, so draft.${verb}() cannot answer`,
                details: { verb },
            });
        }

        return this.read;
    }

    /**
     * A table by id.
     * @param read - The rows.
     * @param id - The table id.
     * @returns The table.
     */
    private table(read: ReadSource, id: string): HeldTable {
        const held = read.tables.find((each) => each.table.id === id);
        if (held === undefined) {
            throw badCommand(`The draft has no table ${JSON.stringify(id)}.`, {
                table: id,
                known: read.tables.map((each) => each.table.id),
            });
        }

        return held;
    }

    /**
     * Every table's roles with the reader's choices applied, each one checked.
     * @param read - The rows.
     * @param mapping - The reader's mapping.
     * @returns The roles.
     */
    private effective(read: ReadSource, mapping: LoadMapping | undefined): LoadMappingRead {
        if (mapping === undefined) {
            return this.mapping;
        }

        let given: Readonly<Record<string, TableMapping>>;
        if ("tables" in mapping) {
            given = mapping.tables;
        } else if (read.tables.length === 1) {
            given = { [read.tables[0].table.id]: mapping };
        } else {
            throw badCommand("A mapping for a source with several tables names each table by id.", {
                tables: read.tables.map((each) => each.table.id),
            });
        }

        const tables: Record<string, TableMappingRead> = { ...this.mapping.tables };
        for (const [id, choice] of Object.entries(given)) {
            const held = this.table(read, id);
            if (held.table.fixed) {
                throw badCommand(`The format sets the roles of table ${JSON.stringify(id)}.`, { table: id });
            }

            const guessed = tables[id];
            const base =
                choice.rowsAre === undefined || choice.rowsAre === guessed.rowsAre
                    ? guessed
                    : guessTable(held, choice.rowsAre, read.source.config ?? {}, this.host.config(), this.guess);
            tables[id] = withChoice(held, base, choice);
        }

        return { tables };
    }

    /**
     * What a set of choices loads.
     * @param read - The rows.
     * @param choices - The choices.
     * @param only - The one table that must be ready, when the caller works with one table; every
     *     table must be when absent.
     * @returns The plan.
     */
    private plan(read: ReadSource, choices: LoadChoices, only?: string): Plan {
        const mapping = this.effective(read, choices.mapping);
        const missing = missingRoles(mapping);
        // A table the reader maps that lacks an end is refused here, naming it: read with one end,
        // every row would be rejected, and read with none, the probe has already failed.
        const unready = read.tables.find(
            (held) =>
                (only === undefined || held.table.id === only) &&
                !held.table.fixed &&
                held.rows.length > 0 &&
                missing[held.table.id].length > 0,
        );
        if (unready !== undefined) {
            const { id } = unready.table;
            throw new GraphtyError({
                code: "E_EDGE_ENDPOINTS_UNRESOLVED",
                source: "data",
                message: `Table ${JSON.stringify(id)} has no ${missing[id].join(" or ")} column; name it in the mapping.`,
                details: { table: id, missing: missing[id], columns: unready.order },
            });
        }

        const named: Plan["knownFields"] = knownFieldsOf(mapping, choices.mapping, read);
        if (
            choices.mode !== "merge" &&
            !("edgeWeightMeaning" in named) &&
            this.host.config().knownFields.edgeWeightMeaning !== null
        ) {
            // A new graph does not inherit the last one's weight meaning.
            Object.assign(named, { edgeWeightMeaning: null });
        }

        // A graph file's label column, which the element reads by itself, or the label column a
        // table's columns name, labels the nodes as the draft's mapping says it will, unless a
        // label path is configured already or a merge keeps how the graph names its nodes.
        const nodeMapping = Object.values(mapping.tables).find((table) => table.rowsAre === "nodes");
        const label = read.tables[0].table.fixed || choices.mode !== "merge" ? (nodeMapping?.label ?? null) : null;
        const labelled =
            label === null || this.host.config().knownFields.nodeLabelPath !== null
                ? named
                : { ...named, nodeLabelPath: label };
        // A confidence, score or strength weighs how alike the ends are, unless a meaning is set.
        const meaning =
            named.edgeWeightMeaning ??
            (choices.mode === "merge" ? this.host.config().knownFields.edgeWeightMeaning : null);
        const similar =
            typeof named.edgeWeightPath === "string" &&
            SIMILARITY_COLUMNS.has(named.edgeWeightPath.toLowerCase()) &&
            meaning === null;
        const knownFields = similar ? { ...labelled, edgeWeightMeaning: "strength" as const } : labelled;
        if (read.tables.every((held) => held.table.fixed)) {
            const [nodes, edges] = read.tables;
            const held: HeldRows = {
                nodes: nodes.rows,
                edges: edges.rows,
                declaredDirection: read.declaredDirection,
                errors: read.errors,
                errorLimit: read.errorLimit,
            };
            // The file's styles are read from the source that read these rows, when a load asks.
            HELD_READERS.set(held, read.reader);
            return { mapping, knownFields, held, endpointNodes: 0 };
        }

        const of = (rowsAre: "nodes" | "edges"): HeldTable | undefined => {
            const found = read.tables.filter((held) => mapping.tables[held.table.id].rowsAre === rowsAre);
            if (found.length > 1) {
                // ponytail: one node table and one edge table per load; several of a kind wait for joins.
                throw badCommand(`A load reads at most one table of ${rowsAre}.`, {
                    rowsAre,
                    tables: found.map((held) => held.table.id),
                });
            }

            return found[0];
        };
        const nodeTable = of("nodes");
        const edgeTable = of("edges");
        const nodeRoles = nodeTable === undefined ? undefined : mapping.tables[nodeTable.table.id];
        const edgeRoles = edgeTable === undefined ? undefined : mapping.tables[edgeTable.table.id];
        const key = nodeRoles?.key ?? null;
        const nodeRows = nodeTable?.rows ?? [];
        const kinds = withKinds(
            key === null ? nodeRows.map((row, index) => ({ ...row, [ROW_ID]: String(index) })) : nodeRows,
            edgeTable?.rows ?? [],
            {
                key: key ?? ROW_ID,
                nodeKind: nodeRoles?.kind ?? null,
                edges: edgeRoles,
                synthesize: nodeTable === undefined,
                scoped: choices.kindIds === "scoped",
            },
        );
        const { edges } = kinds;
        // A merge keeps the ends the graph does not hold as unknown ends, for data.issues().
        const nodes =
            nodeTable === undefined && choices.mode !== "merge"
                ? withEndpointNodes(kinds.nodes, edges, [edgeRoles?.source?.column, edgeRoles?.target?.column])
                : kinds.nodes;
        const held: HeldRows = {
            nodes,
            edges,
            edgeLines: edgeTable?.lines ?? null,
            declaredDirection: readGephiTypeColumn(edges),
            errors: read.errors,
            errorLimit: read.errorLimit,
            ...(key === null ? { idPath: ROW_ID } : { idPath: keyExpression(key) }),
            ...(edgeRoles?.source === undefined ? {} : { source: keyExpression(edgeRoles.source.column) }),
            ...(edgeRoles?.target === undefined ? {} : { target: keyExpression(edgeRoles.target.column) }),
            ...(edgeRoles === undefined ? {} : { weight: edgeRoles.weight ?? null }),
        };
        if (kinds.report !== undefined) {
            HELD_KINDS.set(held, kinds.report);
        }

        return { mapping, knownFields, held, endpointNodes: nodes.length - kinds.nodes.length };
    }

    /**
     * The rows of a table that are unmatched, rejected or loaded under a set of choices.
     * @param read - The rows.
     * @param held - The table.
     * @param only - Which rows.
     * @param choices - The choices `report` and `load` take.
     * @param missing - Filled, by row index, with the ends of each unmatched edge row that name no node.
     * @returns Their indexes.
     */
    private filter(
        read: ReadSource,
        held: HeldTable,
        only: DraftRowFilter,
        choices: LoadChoices,
        missing: Map<number, readonly EdgeEnd[]>,
    ): number[] {
        // Only this table need be ready: another table's missing role does not stop reading this one.
        const { mapping, held: rows } = this.plan(read, choices, held.table.id);
        const roles = mapping.tables[held.table.id];
        const value = (row: Readonly<Record<string, unknown>>, expression: string): unknown =>
            readEndpoint(row, expression);
        const picked: number[] = [];
        if (roles.rowsAre === "nodes") {
            if (only !== "unmatched") {
                const idPath = rows.idPath ?? this.host.config().knownFields.nodeIdPath;
                const seen = new Set<unknown>();
                held.rows.forEach((row, index) => {
                    const id = roles.key === null ? index : value(row, idPath);
                    const rejected = !isStorableId(id);
                    // A row repeating an earlier row's id makes no node of its own.
                    const loaded = !rejected && !seen.has(id);
                    seen.add(id);
                    if (only === "rejected" ? rejected : loaded) {
                        picked.push(index);
                    }
                });
            }

            return picked;
        }

        const source = roles.source?.column;
        const target = roles.target?.column;
        // A fixed table's endpoints are the expressions the format is read with; a CSV's are names.
        const expression = (column: string): string => (held.table.fixed ? column : keyExpression(column));
        const expressions =
            source === undefined || target === undefined ? null : [expression(source), expression(target)];
        const known = new Set<unknown>(
            rows.nodes.map((row) => value(row, rows.idPath ?? this.host.config().knownFields.nodeIdPath)),
        );
        const graph = choices.mode === "merge" ? this.host.graph().nodes : new Set<NodeId>();
        // With no node rows and no graph to name, every node comes from the edges: none is missing.
        const matching = known.size > 0 || graph.size > 0;
        held.rows.forEach((row, index) => {
            const ends = expressions === null ? [null, null] : expressions.map((each) => value(row, each));
            const rejected = !ends.every(isStorableId);
            const missingEnds = EDGE_ENDS.filter((_, at) => {
                const end = ends[at];
                return isStorableId(end) && !known.has(end) && !graph.has(end);
            });
            const unmatched = matching && !rejected && missingEnds.length > 0;
            if (unmatched) {
                missing.set(index, Object.freeze(missingEnds));
            }
            // ponytail: "loaded" counts every repeat as its own edge, as the default `keep` policy
            // does; a folding policy would have to fold repeats here too.
            const loaded = !rejected && !(unmatched && choices.unmatched === "leave-out");
            if ({ rejected, unmatched, loaded }[only]) {
                picked.push(index);
            }
        });
        return picked;
    }
}

/** A graph with nothing in it, for a host that lends none. */
const NO_GRAPH: JoinGraph = { nodes: [], edges: [], joins: new Map() };

/**
 * The table a join reads: the first table with rows, a table of the reader's own before a
 * format's (whose nodes table comes first).
 * @param read - The rows.
 * @returns The table.
 */
function joinedHeld(read: ReadSource): HeldTable {
    const tables = [...read.tables].sort((a, b) => Number(a.table.fixed) - Number(b.table.fixed));
    return tables.find((held) => held.rows.length > 0) ?? tables[0];
}

/**
 * A held table as a join reads it.
 * @param read - The rows.
 * @param held - The table.
 * @returns The table.
 */
function tableOf(read: ReadSource, held: HeldTable): JoinedTable {
    return {
        name: read.source.name ?? held.table.name,
        columns: held.order,
        rows: held.rows,
        source: read.source,
    };
}

/**
 * The roles each table needs and its roles leave unset.
 * @param mapping - Every table's roles.
 * @returns By table id, the required roles left unset.
 */
function missingRoles(mapping: LoadMappingRead): Readonly<Record<string, readonly ColumnRole[]>> {
    return Object.freeze(
        Object.fromEntries(
            Object.entries(mapping.tables).map(([id, roles]) => [
                id,
                Object.freeze(
                    LOAD_ROLES[roles.rowsAre].requires.filter((role) => {
                        const value: unknown = roles[role as keyof TableMappingRead];
                        return value === undefined || value === null;
                    }),
                ),
            ]),
        ),
    );
}

/**
 * The column a table could take as its weight, when its reading as edges finds none: the first
 * column every row of which holds a number, that no other role reads.
 * @param held - The table.
 * @param asEdges - The table's roles read as edges.
 * @returns The column's name, or undefined.
 */
function weightCandidateOf(held: HeldTable, asEdges: TableMappingRead): string | undefined {
    if (held.table.fixed || asEdges.weight !== null) {
        return undefined;
    }

    const taken = new Set([asEdges.source?.column, asEdges.target?.column, asEdges.time, asEdges.edgeId]);
    return held.table.columns.find(
        (column) =>
            (column.type === "number" || column.type === "integer") &&
            column.completeness === 1 &&
            !taken.has(column.name),
    )?.name;
}

/**
 * Which role each column of a table has.
 * @param roles - The table's roles.
 * @returns The role by column name.
 */
function suggestedRoles(roles: TableMappingRead): Map<string, NonNullable<DraftColumn["suggested"]>> {
    const out = new Map<string, NonNullable<DraftColumn["suggested"]>>();
    const set = (role: NonNullable<DraftColumn["suggested"]>, column: string | null | undefined): void => {
        if (typeof column === "string" && !out.has(column)) {
            out.set(column, role);
        }
    };
    set("key", roles.key);
    set("source", roles.source?.column);
    set("target", roles.target?.column);
    set("weight", roles.weight);
    set("label", roles.label);
    set("time", roles.time);
    set("edgeId", roles.edgeId);
    set("kind", roles.kind);
    return out;
}

/**
 * A table's roles with one choice applied, every column it names checked.
 * @param held - The table.
 * @param base - Its roles before the choice.
 * @param choice - The reader's choice.
 * @returns Its roles.
 * @throws `E_BAD_COMMAND` for a role its rows cannot have, `E_UNKNOWN_ATTRIBUTE` for a column it lacks.
 */
function withChoice(held: HeldTable, base: TableMappingRead, choice: TableMapping): TableMappingRead {
    const rowsAre = choice.rowsAre ?? base.rowsAre;
    const out: Record<string, unknown> = { ...base, rowsAre };
    for (const [role, value] of Object.entries(choice)) {
        if (role === "weightMeaning") {
            out[role] = checkedMeaning(held, rowsAre, value);
        } else if (role === "timeUnit") {
            out[role] = checkedUnit(held, value);
        } else if (value !== undefined && role !== "rowsAre") {
            out[role] = checkedRole(held, rowsAre, role, value);
        }
    }

    return Object.freeze(out) as unknown as TableMappingRead;
}

/** The units a time column's numbers can be read in at load. */
const TIME_UNIT_CHOICES: ReadonlySet<unknown> = new Set(["ms", "s", "year", "ordinal", null, undefined]);

/**
 * A reader's time unit, checked.
 * @param held - The table.
 * @param value - The unit.
 * @returns The unit.
 * @throws `E_BAD_COMMAND` for a unit the element does not know.
 */
function checkedUnit(held: HeldTable, value: unknown): unknown {
    if (!TIME_UNIT_CHOICES.has(value)) {
        throw badCommand(`A time unit is "ms", "s", "year", "ordinal" or null.`, {
            table: held.table.id,
            role: "timeUnit",
            units: ["ms", "s", "year", "ordinal"],
        });
    }

    return value;
}

/** The meanings an edge weight can be given at load. */
const WEIGHT_MEANINGS: ReadonlySet<unknown> = new Set(["distance", "strength", "capacity", null, undefined]);

/**
 * A reader's weight meaning, checked.
 * @param held - The table.
 * @param rowsAre - What its rows become.
 * @param value - The meaning.
 * @returns The meaning.
 * @throws `E_BAD_COMMAND` for a node table's meaning or one the element does not know.
 */
function checkedMeaning(held: HeldTable, rowsAre: "nodes" | "edges", value: unknown): unknown {
    if ((rowsAre === "nodes" && value !== undefined) || !WEIGHT_MEANINGS.has(value)) {
        throw badCommand(`A weight meaning is "distance", "strength", "capacity" or null, on a table of edges.`, {
            table: held.table.id,
            role: "weightMeaning",
            meanings: ["distance", "strength", "capacity"],
        });
    }

    return value;
}

/**
 * One role of a reader's choice, checked against the table: its read form.
 * @param held - The table.
 * @param rowsAre - What its rows become.
 * @param role - The role.
 * @param value - The column the reader named, `{ column }`, or null.
 * @returns The role's read form.
 * @throws `E_BAD_COMMAND` for a role its rows cannot have, `E_UNKNOWN_ATTRIBUTE` for a column it lacks.
 */
function checkedRole(held: HeldTable, rowsAre: "nodes" | "edges", role: string, value: unknown): unknown {
    if (!ROLES[rowsAre].has(role)) {
        throw badCommand(`A table of ${rowsAre} has no ${JSON.stringify(role)} role.`, {
            table: held.table.id,
            role,
            roles: [...ROLES[rowsAre]],
        });
    }

    const column = typeof value === "object" && value !== null ? (value as { column?: unknown }).column : value;
    if (column === null) {
        return value;
    }

    // A bare string is a kind name, not a column.
    if ((role === "sourceKind" || role === "targetKind") && typeof value === "string") {
        return value;
    }

    if (typeof column !== "string") {
        throw badCommand(`The ${role} role takes a column name or null.`, { table: held.table.id, role });
    }

    const kind: "node" | "edge" = rowsAre === "nodes" ? "node" : "edge";
    resolveColumn(
        held.order.map((name) => ({ kind, name })),
        { kind, name: column },
    );
    // An end is always held as `{ column }`; a kind column given as `{ column }` stays one.
    return role === "source" || role === "target" || typeof value === "object" ? { column } : value;
}

/**
 * The `data.knownFields` one table's choice writes.
 * @param nodes - Whether its rows are nodes.
 * @param choice - The reader's choice for it.
 * @returns The fields.
 */
function tableFields(nodes: boolean, choice: TableMapping): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    if (choice.time !== undefined) {
        out[nodes ? "nodeTimePath" : "edgeTimePath"] = choice.time;
    }

    if (choice.timeUnit !== undefined) {
        out[nodes ? "nodeTimeUnit" : "edgeTimeUnit"] = choice.timeUnit;
    }

    if (nodes) {
        if (choice.label !== undefined) {
            out.nodeLabelPath = choice.label;
        }

        return out;
    }

    if (choice.weight !== undefined) {
        out.edgeWeightPath = choice.weight;
    }

    if (choice.weight !== undefined || choice.weightMeaning !== undefined) {
        // A weight named without a meaning clears the last load's, so it never describes this one.
        out.edgeWeightMeaning = choice.weightMeaning ?? null;
    }

    if (choice.edgeId !== undefined) {
        out.edgeIdPath = choice.edgeId === null ? null : keyExpression(choice.edgeId);
    }

    return out;
}

/**
 * What a load writes to `data.knownFields`: the roles the reader named, read after the load.
 * A label, weight or time is written as the literal column name, as their readers read it; an
 * edge id as an expression, as its reader evaluates it.
 * @param mapping - Every table's roles.
 * @param given - What the reader named.
 * @param read - The rows.
 * @returns The fields to write.
 */
function knownFieldsOf(
    mapping: LoadMappingRead,
    given: LoadMapping | undefined,
    read: ReadSource,
): Plan["knownFields"] {
    if (given === undefined) {
        return {};
    }

    const tables: Readonly<Record<string, TableMapping>> =
        "tables" in given ? given.tables : { [read.tables[0].table.id]: given };
    const out: Record<string, string | null> = {};
    for (const [id, choice] of Object.entries(tables)) {
        Object.assign(out, tableFields(mapping.tables[id].rowsAre === "nodes", choice));
    }

    return out;
}

/**
 * An edge table's nodes, when the load has no node table: a row of its own for every value an end
 * names, so each node the edges make is drawn. A node the store holds with no row of its own waits
 * for one, as a streamed edge waits for its endpoint, and an edge table alone never sends one.
 * @param nodes - The node rows already made (the kinds' own, keyed by the row id).
 * @param edges - The edge rows.
 * @param ends - The source and target columns.
 * @returns The node rows, the given ones first.
 */
function withEndpointNodes(
    nodes: readonly Record<string, unknown>[],
    edges: readonly Record<string, unknown>[],
    ends: readonly (string | undefined)[],
): readonly Record<string, unknown>[] {
    const columns = ends.filter((column): column is string => column !== undefined);
    const seen = new Set(nodes.map((row) => row[ROW_ID]));
    const out = [...nodes];
    for (const row of edges) {
        for (const column of columns) {
            const id = row[column];
            if (isStorableId(id) && !seen.has(id)) {
                seen.add(id);
                out.push({ [ROW_ID]: id });
            }
        }
    }

    return out;
}

/** What {@link withKinds} reads a load's kinds by. */
interface KindRoles {
    /** The node table's id column. */
    readonly key: string;
    /** The node table's kind column, or null. */
    readonly nodeKind: string | null;
    /** The edge table's roles, when there is one. */
    readonly edges: TableMappingRead | undefined;
    /** Whether the edges' nodes come from the edges alone, so their kinds need node rows of their own. */
    readonly synthesize: boolean;
    /** `LoadChoices.kindIds` is `"scoped"`. */
    readonly scoped: boolean;
}

/**
 * A row's kind, by a kind name or a column.
 * @param row - The row.
 * @param spec - A kind name, `{ column }`, or a column name when `named` is false.
 * @param named - Whether a bare string is a kind name (an endpoint kind) or a column (a kind role).
 * @returns The kind, or undefined when the row has none.
 */
function kindOf(row: Readonly<Record<string, unknown>>, spec: unknown, named: boolean): string | undefined {
    if (spec === null || spec === undefined) {
        return undefined;
    }

    if (typeof spec === "string" && named) {
        return spec;
    }

    const value = row[typeof spec === "string" ? spec : (spec as { column: string }).column];
    // A kind is a name: an empty cell, or a value that is not text, a number or a truth value, names none.
    const nameable = typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    return nameable && value !== "" ? String(value) : undefined;
}

/**
 * The rows a load hands over with their kinds applied: each node with a kind carries it as its
 * `kind` attribute, an edge kind column loads as the edge's `kind`, and under `"scoped"` an id
 * value that appears under two kinds becomes `<kind>:<value>` wherever it appears with a kind.
 * @param nodes - The node rows, each with an id at `roles.key`.
 * @param edges - The edge rows.
 * @param roles - Where the kinds are read.
 * @returns The rows, and the report's `kinds` when the mapping names any node kind.
 */
function withKinds(
    nodes: readonly Record<string, unknown>[],
    edges: readonly Record<string, unknown>[],
    roles: KindRoles,
): {
    nodes: readonly Record<string, unknown>[];
    edges: readonly Record<string, unknown>[];
    report?: LoadReport["kinds"];
} {
    const { key, nodeKind } = roles;
    const source = roles.edges?.source?.column;
    const target = roles.edges?.target?.column;
    const ends = [
        { column: source, kind: roles.edges?.sourceKind },
        { column: target, kind: roles.edges?.targetKind },
    ].filter(
        (end): end is { column: string; kind: string | Endpoint } =>
            end.column !== undefined && end.kind !== undefined && end.kind !== null,
    );
    const edgeKind = roles.edges?.kind ?? null;
    if (nodeKind === null && ends.length === 0 && edgeKind === null) {
        return { nodes, edges };
    }

    // Every id value's kinds, in the order first seen.
    const kindsOf = new Map<unknown, string[]>();
    const note = (id: unknown, kind: string | undefined): void => {
        if (kind === undefined || !isStorableId(id)) {
            return;
        }

        const seen = kindsOf.get(id) ?? [];
        if (!seen.includes(kind)) {
            seen.push(kind);
        }

        kindsOf.set(id, seen);
    };
    for (const row of nodes) {
        note(row[key], kindOf(row, nodeKind, false));
    }

    for (const row of edges) {
        for (const end of ends) {
            note(row[end.column], kindOf(row, end.kind, true));
        }
    }

    const idOf = (id: unknown, kind: string | undefined): unknown =>
        roles.scoped && kind !== undefined && (kindsOf.get(id)?.length ?? 0) > 1 ? `${kind}:${String(id)}` : id;
    // ponytail: a node row with no kind of its own takes the first kind an edge gave its id.
    const outNodes = nodes.map((row) => {
        const kind = kindOf(row, nodeKind, false) ?? kindsOf.get(row[key])?.[0];
        return kind === undefined ? row : { ...row, [key]: idOf(row[key], kind), [KIND]: kind };
    });
    const made = new Set<unknown>();
    const outEdges = edges.map((row) => {
        const out: Record<string, unknown> = { ...row };
        for (const end of ends) {
            const kind = kindOf(row, end.kind, true);
            const id = idOf(row[end.column], kind);
            out[end.column] = id;
            // ponytail: with a node table, an end no node row names is made by the edge, without a
            // kind; give it a node row here too if that matters (it would end its "unmatched" count).
            if (roles.synthesize && kind !== undefined && isStorableId(id) && !made.has(id)) {
                made.add(id);
                outNodes.push({ [key]: id, [KIND]: kind });
            }
        }

        if (edgeKind !== null) {
            out[KIND] = row[edgeKind];
        }

        return out;
    });

    if (nodeKind === null && ends.length === 0) {
        return { nodes: outNodes, edges: outEdges };
    }

    const byKind: Record<string, number> = {};
    let sharedIds = 0;
    for (const kinds of kindsOf.values()) {
        sharedIds += kinds.length > 1 ? 1 : 0;
        for (const kind of kinds) {
            byKind[kind] = (byKind[kind] ?? 0) + 1;
        }
    }

    return {
        nodes: outNodes,
        edges: outEdges,
        report: Object.freeze({ sharedIds, byKind: Object.freeze(byKind) }),
    };
}
