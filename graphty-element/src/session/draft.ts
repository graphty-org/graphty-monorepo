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
import { GraphtyError } from "../errors";
import { describeRows } from "./attributes";
import { resolveColumn } from "./columns";
import type { BatchCommand } from "./commands";
import type { DataImportCommand, HeldRows, ImportSource } from "./commands/data";
import { isStorableId, unreadableSource, untilAborted } from "./project/ingest";
import type {
    ColumnRole,
    DraftColumn,
    DraftRow,
    DraftRowFilter,
    DraftRowOptions,
    DraftTable,
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

/** What a draft needs from the session it loads into. */
interface DraftHost {
    /** The data configuration now. */
    config(): SessionDataConfig;
    /** The node ids the graph holds and its edge count, for a merge. */
    graph(): { readonly nodes: ReadonlySet<NodeId>; readonly edges: number };
    /** Taken synchronously: dispatches a command as the session's next step. */
    importer(): (command: DataImportCommand | BatchCommand) => Promise<unknown>;
    /** Runs an import in a scratch session with this configuration and returns its report. */
    measure(command: DataImportCommand, config: SessionDataConfig): Promise<LoadReport>;
    /** The draft has been disposed. */
    released(draft: Draft): void;
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
interface ReadSource {
    readonly source: ImportSource;
    readonly tables: readonly HeldTable[];
    readonly declaredDirection: DeclaredDirection | null;
    readonly errors: readonly DataLoadingError[];
    readonly errorLimit: number;
}

/**
 * The column roles a table of each kind takes (`takes`), and the ones a load cannot do without
 * (`requires`). A node table needs no role: without a `key` its rows are numbered. An edge table
 * needs both ends. Plain data, safe to import in Node.
 */
export const LOAD_ROLES: Readonly<
    Record<"nodes" | "edges", { readonly takes: readonly ColumnRole[]; readonly requires: readonly ColumnRole[] }>
> = Object.freeze({
    nodes: Object.freeze({ takes: Object.freeze(["key", "label", "time"] as const), requires: Object.freeze([]) }),
    edges: Object.freeze({
        takes: Object.freeze(["source", "target", "weight", "time", "edgeId"] as const),
        requires: Object.freeze(["source", "target"] as const),
    }),
});

/** The keys a table's mapping takes: `rowsAre` and its roles. */
const ROLES: Readonly<Record<"nodes" | "edges", ReadonlySet<string>>> = {
    nodes: new Set(["rowsAre", ...LOAD_ROLES.nodes.takes]),
    edges: new Set(["rowsAre", ...LOAD_ROLES.edges.takes]),
};

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
function keyExpression(name: string): string {
    return /^[A-Za-z_]\w*$/.test(name) ? name : JSON.stringify(name);
}

/**
 * The name of one file of a pair: the `File`'s name, or the URL's last part.
 * @param value - A `nodeFile`, `edgeFile`, `nodeURL` or `edgeURL` option.
 * @returns The name, or undefined.
 */
function fileName(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value.split(/[?#]/)[0]?.split("/").pop();
    }

    const named = (value as { name?: unknown } | null | undefined)?.name;
    return typeof named === "string" ? named : undefined;
}

/**
 * Whether a source hands over a CSV node file and edge file as a pair.
 * @param config - The source's options.
 * @returns True for a pair.
 */
export function isPair(config: Readonly<Record<string, unknown>>): boolean {
    return ["nodeFile", "edgeFile", "nodeURL", "edgeURL"].some((key) => config[key] !== undefined);
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
 * @param progress - Told the rows read so far, after each table or chunk.
 * @returns What it holds.
 * @throws What the source's reader throws, with its code.
 */
export async function readSource(
    source: ImportSource,
    signal?: AbortSignal,
    progress: (rows: number) => void = () => undefined,
): Promise<ReadSource> {
    const type = source.type ?? "";
    const config = source.config ?? {};
    const reader = DataSource.get(type, config);
    if (reader === null) {
        throw unknownFormat(type);
    }

    const named = source.name ?? type;
    const rowTables = reader instanceof CSVDataSource ? await reader.readRows() : null;
    signal?.throwIfAborted();
    if (rowTables !== null) {
        const pairNames: Readonly<Record<string, string | undefined>> = {
            nodes: fileName(config.nodeFile ?? config.nodeURL),
            edges: fileName(config.edgeFile ?? config.edgeURL),
        };
        const tables = Object.entries(rowTables).map(([id, read]) =>
            heldTable(id, pairNames[id] ?? named, false, read.rows, read.lines, read.columns, read.delimiter),
        );
        progress(tables.reduce((sum, held) => sum + held.rows.length, 0));
        return { source, tables, declaredDirection: null, ...errorsOf(reader) };
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

    return {
        source,
        tables: [heldTable("nodes", named, true, nodes, null), heldTable("edges", named, true, edges, null)],
        declaredDirection: reader.declaredDirection,
        ...errorsOf(reader),
    };
}

/**
 * The element's own reading of one table.
 * @param held - The table.
 * @param rowsAre - What its rows are, when already decided.
 * @param source - The source's options, for the deprecated CSV column aliases.
 * @param config - The data configuration.
 * @returns The table's roles.
 */
function guessTable(
    held: HeldTable,
    rowsAre: "nodes" | "edges" | undefined,
    source: Readonly<Record<string, unknown>>,
    config: SessionDataConfig,
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
    const pair: readonly [string, string] | undefined =
        aliasSource !== undefined && aliasTarget !== undefined
            ? [aliasSource, aliasTarget]
            : [...(source.variant === "gephi" ? [["Source", "Target"] as const] : []), ...ENDPOINT_PAIRS].find(
                  ([from, to]) => has(from) && has(to),
              );
    const idColumn = has(source.idColumn) ? source.idColumn : NODE_ID_COLUMNS.find(has);
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
            label: present(knownFields.nodeLabelPath),
            time: present(knownFields.nodeTimePath),
        };
    }

    const weight = present(knownFields.edgeWeightPath) ?? present("value");
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
}

/** A source read and held: the {@link LoadDraft} `session.data.prepare()` returns. */
export class Draft implements LoadDraft {
    readonly type: string;
    readonly tables: readonly DraftTable[];
    readonly mapping: LoadMappingRead;

    private read: ReadSource | null;
    private readonly host: DraftHost;

    /**
     * Hold what was read.
     * @param read - The source's rows.
     * @param host - The session.
     */
    constructor(read: ReadSource, host: DraftHost) {
        this.read = read;
        this.host = host;
        this.type = read.source.type ?? "";
        this.tables = Object.freeze(read.tables.map((held) => Object.freeze(held.table)));
        const config = host.config();
        const options = read.source.config ?? {};
        let guesses = read.tables.map((held) => guessTable(held, undefined, options, config));
        if (guesses.length === 2 && guesses[0].rowsAre === guesses[1].rowsAre) {
            // Both files of a pair read as the same kind: the order they were handed over in decides.
            guesses = read.tables.map((held) => guessTable(held, held.table.id as "nodes" | "edges", options, config));
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
        return this.host.measure(
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
        const picked = only === undefined ? null : this.filter(read, held, only, choices);
        const total = picked?.length ?? held.rows.length;
        const records: DraftRow[] = [];
        for (let i = offset; i < Math.min(total, offset + limit); i++) {
            const index = picked?.[i] ?? i;
            records.push(Object.freeze({ line: held.lines?.[index] ?? index + 1, values: held.rows[index] }));
        }

        return Object.freeze({ records: Object.freeze(records), offset, total, revision: "draft" });
    }

    /**
     * Load the held rows as one undoable step.
     * @param choices - The column roles and the rest.
     * @returns Settles once the rows are in the graph.
     */
    async load(choices: LoadChoices = {}): Promise<void> {
        await this.loadVia(this.host.importer(), choices);
    }

    /**
     * Load through a dispatch taken earlier, as `import` takes it before its first await.
     * @param send - The dispatch.
     * @param choices - The column roles and the rest.
     * @returns Settles once the rows are in the graph.
     */
    async loadVia(send: ReturnType<DraftHost["importer"]>, choices: LoadChoices = {}): Promise<void> {
        const read = this.live("load");
        const plan = this.plan(read, choices);
        const command: DataImportCommand = {
            op: "data.import",
            source: read.source,
            mode: choices.mode ?? "replace",
            ...(choices.layout === undefined ? {} : { layout: choices.layout }),
            held: plan.held,
            ...(choices.unmatched === undefined ? {} : { unmatched: choices.unmatched }),
            ...(choices.duplicateIds === undefined ? {} : { duplicateIds: choices.duplicateIds }),
        };
        const data = {
            ...(choices.directed === undefined ? {} : { directed: choices.directed }),
            ...(Object.keys(plan.knownFields).length === 0 ? {} : { knownFields: plan.knownFields }),
        };
        await send(
            Object.keys(data).length === 0
                ? command
                : { op: "batch", steps: [{ op: "config.set", values: { data } }, command] },
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
                    : guessTable(held, choice.rowsAre, read.source.config ?? {}, this.host.config());
            tables[id] = withChoice(held, base, choice);
        }

        return { tables };
    }

    /**
     * What a set of choices loads.
     * @param read - The rows.
     * @param choices - The choices.
     * @returns The plan.
     */
    private plan(read: ReadSource, choices: LoadChoices): Plan {
        const mapping = this.effective(read, choices.mapping);
        const missing = missingRoles(mapping);
        // A table the reader maps that lacks an end is refused here, naming it: read with one end,
        // every row would be rejected, and read with none, the probe has already failed.
        const unready = read.tables.find(
            (held) => !held.table.fixed && held.rows.length > 0 && missing[held.table.id].length > 0,
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

        const named = knownFieldsOf(mapping, choices.mapping, read);
        // A graph file's label column, which the element reads by itself, labels the nodes as the
        // draft's mapping says it will, unless a label path is configured already.
        const label = read.tables[0].table.fixed ? (mapping.tables.nodes?.label ?? null) : null;
        const knownFields =
            label === null || this.host.config().knownFields.nodeLabelPath !== null
                ? named
                : { ...named, nodeLabelPath: label };
        if (read.tables.every((held) => held.table.fixed)) {
            const [nodes, edges] = read.tables;
            return {
                mapping,
                knownFields,
                held: {
                    nodes: nodes.rows,
                    edges: edges.rows,
                    declaredDirection: read.declaredDirection,
                    errors: read.errors,
                    errorLimit: read.errorLimit,
                },
            };
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
        const edges = edgeTable?.rows ?? [];
        const nodeRows = nodeTable?.rows ?? [];
        return {
            mapping,
            knownFields,
            held: {
                nodes: key === null ? nodeRows.map((row, index) => ({ ...row, [ROW_ID]: String(index) })) : nodeRows,
                edges,
                declaredDirection: readGephiTypeColumn(edges),
                errors: read.errors,
                errorLimit: read.errorLimit,
                ...(key === null ? { idPath: ROW_ID } : { idPath: keyExpression(key) }),
                ...(edgeRoles?.source === undefined ? {} : { source: keyExpression(edgeRoles.source.column) }),
                ...(edgeRoles?.target === undefined ? {} : { target: keyExpression(edgeRoles.target.column) }),
                ...(edgeRoles === undefined ? {} : { weight: edgeRoles.weight ?? null }),
            },
        };
    }

    /**
     * The rows of a table that are unmatched, rejected or loaded under a set of choices.
     * @param read - The rows.
     * @param held - The table.
     * @param only - Which rows.
     * @param choices - The choices `report` and `load` take.
     * @returns Their indexes.
     */
    private filter(read: ReadSource, held: HeldTable, only: DraftRowFilter, choices: LoadChoices): number[] {
        const { mapping, held: rows } = this.plan(read, choices);
        const roles = mapping.tables[held.table.id];
        const value = (row: Readonly<Record<string, unknown>>, expression: string): unknown =>
            readEndpoint(row as Record<string, unknown>, expression);
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
            const unmatched = matching && !rejected && ends.some((end) => !known.has(end) && !graph.has(end as NodeId));
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
                        const value = roles[role];
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
        if (value !== undefined && role !== "rowsAre") {
            out[role] = checkedRole(held, rowsAre, role, value);
        }
    }

    return Object.freeze(out) as unknown as TableMappingRead;
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

    if (typeof column !== "string") {
        throw badCommand(`The ${role} role takes a column name or null.`, { table: held.table.id, role });
    }

    const kind: "node" | "edge" = rowsAre === "nodes" ? "node" : "edge";
    resolveColumn(
        held.order.map((name) => ({ kind, name })),
        { kind, name: column },
    );
    return role === "source" || role === "target" ? { column } : value;
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

    if (nodes) {
        if (choice.label !== undefined) {
            out.nodeLabelPath = choice.label;
        }

        return out;
    }

    if (choice.weight !== undefined) {
        out.edgeWeightPath = choice.weight;
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
