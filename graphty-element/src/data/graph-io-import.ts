import {
    type AttributeTable,
    type Column,
    type ColumnHandle,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeId,
    type U32,
} from "@graphty/graph-format";
import {
    type CommonImportOptions,
    formatF32,
    type GraphImporter,
    ImportError,
    type ImportReport,
} from "@graphty/graph-io";

import type { AdHocData } from "../config/common.js";
import { GraphtyError } from "../errors/index.js";
import type { ErrorAggregator } from "./ErrorAggregator.js";

/** How the scratch builder treats what the importer pushes, beyond what graph-format does itself. */
interface ScratchPolicy {
    /**
     * Store every attribute the importer did not declare a type for as a `json` column, so a value
     * reaches the element exactly as the file held it. For a format whose values are already typed
     * (JSON): the default per-column inference would turn a `value` of 42 in one record and "n/a"
     * in another into the strings "42" and "n/a".
     */
    readonly verbatim?: boolean;
    /**
     * Keep the FIRST declaration of a repeated node id, as the element does with repeated records.
     * graph-io merges a repeat into the node it repeats with the later values winning. An importer
     * that declares each node as it reads it writes a repeat's values straight after the repeated
     * declaration, and those are ignored until it moves on to another node or an edge; one that
     * creates its nodes up front (Pajek) writes a repeat's values into cells already written, and
     * a node cell is never written twice.
     */
    readonly firstDeclarationWins?: boolean;
}

/**
 * A scratch builder that remembers which nodes the file itself declared.
 *
 * An importer adds a node through `addNode` when the file declares it; a node an edge names but
 * the file never declared is created by the builder inside `addEdge`. The element has always
 * yielded only the declared ones and let the store create the rest, so the difference is kept.
 */
class DeclaringBuilder extends GraphBuilder {
    readonly declared = new Set<NodeId>();

    private readonly policy: ScratchPolicy;

    /** The row of a repeated declaration whose values are being ignored, or -1. */
    private muted = -1;

    /** Under `firstDeclarationWins`, the rows each node column has had a value written to. */
    private readonly written = new Map<ColumnHandle, Set<number>>();

    constructor(policy: ScratchPolicy) {
        super({ directed: false, weightDtype: "f64" });
        this.policy = policy;
    }

    override addNode(id: NodeId): number {
        const repeated = this.declared.has(id);
        const row = super.addNode(id);
        this.declared.add(id);
        this.muted = repeated && this.policy.firstDeclarationWins === true ? row : -1;
        return row;
    }

    override addNodes(ids: Iterable<NodeId>, out?: U32): U32 {
        const list = [...ids];
        const rows = super.addNodes(list, out);
        for (const id of list) {
            this.declared.add(id);
        }

        this.muted = -1;
        return rows;
    }

    override addEdge(source: NodeId, target: NodeId, weight?: number): number {
        this.muted = -1;
        return super.addEdge(source, target, weight);
    }

    override setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void {
        if (index === this.muted) {
            return;
        }

        if (this.policy.verbatim === true && this.undeclared(column, this.nodeColumn.bind(this), value)) {
            this.declareNodeColumn({ name: column as string, dtype: "json" });
        }

        if (this.policy.firstDeclarationWins !== true) {
            super.setNodeValue(column, index, value);
            return;
        }

        const before = typeof column === "string" ? this.nodeColumn(column) : column;
        if (this.written.get(before)?.has(index) === true) {
            return;
        }

        super.setNodeValue(column, index, value);
        const handle = typeof column === "string" ? this.nodeColumn(column) : column;
        let rows = this.written.get(handle);
        if (rows === undefined) {
            rows = new Set();
            this.written.set(handle, rows);
        }

        rows.add(index);
    }

    override setEdgeValue(column: ColumnHandle | string, edge: number, value: unknown): void {
        if (this.policy.verbatim === true && this.undeclared(column, this.edgeColumn.bind(this), value)) {
            this.declareEdgeColumn({ name: column as string, dtype: "json" });
        }

        super.setEdgeValue(column, edge, value);
    }

    /**
     * Whether a value is about to be written by name to a column nobody declared yet.
     * @param column - the handle or name
     * @param lookup - the builder's lookup for the table
     * @param value - the value
     * @returns true when the column would otherwise be inferred
     */
    private undeclared(column: ColumnHandle | string, lookup: (name: string) => ColumnHandle, value: unknown): boolean {
        return typeof column === "string" && value !== undefined && value !== null && lookup(column) === INVALID_INDEX;
    }
}

/** What one import produced: the frozen scratch graph, the importer's report and the declared nodes. */
export interface ImportedGraph {
    readonly snapshot: GraphSnapshot;
    readonly report: ImportReport;
    /** The ids of the nodes the file declared, as opposed to those an edge created. */
    readonly declared: ReadonlySet<NodeId>;
}

/**
 * Run a graph-io importer over a document into a scratch builder and freeze it.
 *
 * The scratch builder, not the element's own, is the importer's sink: the element's builder holds
 * no attribute columns, so a data source reads the file here and rebuilds its records from the
 * columns afterwards (see {@link toRecords}).
 *
 * A document that is recognisably this format but breaks off (a tag left open, a stray end tag)
 * keeps what was read before the break: the importer's fatal error becomes one more error in the
 * report rather than a thrown one. A document the importer does not recognise at all, or one whose
 * report holds one of the `fatal` codes, still throws; with `fatal` "any", every failure throws.
 * @param importer - the graph-io importer for the format
 * @param text - the whole document
 * @param options - importer options; `ids` defaults to "string", so ids stay the text the file wrote
 * @param fatal - issue codes that make even a recognisable document unreadable, or "any"
 * @param policy - how the scratch builder treats what the importer pushes
 * @returns the snapshot, the report and the declared node ids
 */
export async function importDocument<Opts>(
    importer: GraphImporter<Opts>,
    text: string,
    options: Opts & CommonImportOptions,
    fatal: readonly string[] | "any" = [],
    policy: ScratchPolicy = {},
): Promise<ImportedGraph> {
    const builder = new DeclaringBuilder(policy);
    let report: ImportReport;
    try {
        report = await importer.import(text, builder, { ids: "string", ...options });
    } catch (error) {
        const recognised = importer.sniff?.(new TextEncoder().encode(text.slice(0, 4096))) ?? 0;
        if (
            !(error instanceof ImportError) ||
            fatal === "any" ||
            recognised === 0 ||
            error.report.issues.some((issue) => fatal.includes(issue.code))
        ) {
            throw error;
        }

        ({ report } = error);
    }

    return { snapshot: builder.freeze(), report, declared: builder.declared };
}

/**
 * Import a document that must be read whole, and turn a failure into `E_PARSE_FAILED`.
 *
 * For a format whose broken file is better refused than half-loaded: the load fails as a whole,
 * naming the line of the last error, so the graph on screen stays as it was. The importer's
 * errors reach the aggregator either way.
 * @param importer - the graph-io importer for the format
 * @param text - the whole document
 * @param options - importer options
 * @param errors - the data source's aggregator
 * @param policy - how the scratch builder treats what the importer pushes
 * @returns the import
 * @throws A `GraphtyError` with `E_PARSE_FAILED` when the importer gave up on the file.
 */
export async function importWhole<Opts>(
    importer: GraphImporter<Opts>,
    text: string,
    options: Opts & CommonImportOptions,
    errors: ErrorAggregator,
    policy: ScratchPolicy = {},
): Promise<ImportedGraph> {
    let imported: ImportedGraph;
    try {
        imported = await importDocument(importer, text, options, "any", policy);
    } catch (error) {
        if (!(error instanceof ImportError)) {
            throw error;
        }

        aggregateErrors(error.report, errors);
        const line = error.report.issues.filter((issue) => issue.severity === "error").at(-1)?.line ?? null;
        throw GraphtyError.wrap(error, {
            code: "E_PARSE_FAILED",
            source: "data",
            message: `Failed to read the ${importer.format} file${line === null ? "" : ` at line ${line}`}: ${error.message}`,
            details: { format: importer.format, line, errors: error.report.errorCount },
        });
    }

    aggregateErrors(imported.report, errors);
    return imported;
}

/**
 * The element's wording for a blank endpoint, which is what a reader is told in every format.
 * @param message - graph-io's message, which names the end that is blank
 * @returns "Missing source" or "Missing target"
 */
function missingEndpoint(message: string): string {
    return /target|END_ID/.test(message) ? "Missing target" : "Missing source";
}

/**
 * Copy the errors of an import report into the source's aggregator.
 *
 * Warnings stay in the report: the aggregator has always counted only what went wrong, and a
 * warning is something the importer read and kept.
 * @param report - the importer's report
 * @param errors - the data source's aggregator
 * @param stopAtLimit - throw once the aggregator's error limit is reached, as the CSV and JSON
 *     readers always have
 * @throws Error when `stopAtLimit` is set and the limit is reached
 */
export function aggregateErrors(report: ImportReport, errors: ErrorAggregator, stopAtLimit = false): void {
    for (const issue of report.issues) {
        if (issue.severity !== "error") {
            continue;
        }

        const canContinue = errors.addError({
            message:
                issue.code === "E_MISSING_ENDPOINT"
                    ? `${missingEndpoint(issue.message)}: ${issue.message}`
                    : issue.message,
            category: issue.category,
            ...(issue.line === null ? {} : { line: issue.line }),
            ...(issue.element === null ? {} : { field: issue.element }),
        });

        if (stopAtLimit && !canContinue) {
            throw new Error(`Too many errors (${errors.getErrorCount()}), aborting parse`);
        }
    }
}

/**
 * A cell as the element's records carry it.
 *
 * An f32 cell is widened to the shortest decimal that reads back to the same f32, so a `float`
 * attribute written as 0.1 arrives as 0.1 rather than as 0.10000000149011612.
 * @param column - the column
 * @param row - the row
 * @returns the value
 */
export function cell(column: Column, row: number): unknown {
    const value = column.value(row);
    return column.dtype === "f32" && typeof value === "number" ? Number(formatF32(value)) : value;
}

/**
 * The components of a multi-component f32 or f64 cell, each widened as {@link cell} does.
 * @param column - a column with `components > 1`
 * @param row - the row
 * @returns the components
 */
export function components(column: Column, row: number): number[] {
    const value = column.value(row) as ArrayLike<number>;
    return Array.from(value, (v) => (column.dtype === "f32" ? Number(formatF32(v)) : v));
}

/**
 * The title a declared attribute was written with.
 *
 * graph-io names an attribute's column after its title (a GEXF `title`, a GraphML `attr.name`),
 * but renames it `<title>#<id>` when that name is taken -- in GEXF by one of its own fields
 * (`label`, `color`, `size`, ...). The element has always keyed the value by its title.
 * @param name - the column name
 * @param id - the attribute's id in the file
 * @returns the title
 */
export function attributeTitle(name: string, id: string): string {
    const suffix = `#${id}`;
    return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

/** How one format turns a row of the scratch graph into the keys of its record. */
export interface RecordMapping {
    /** Write a node's keys onto its record, which already holds `id`. */
    node(row: number, record: Record<string, unknown>): void;
    /** Write an edge's keys onto its record, which already holds `source`, `target` and any `weight`. */
    edge(row: number, record: Record<string, unknown>): void;
}

/** The prefix graph-format reserves for the columns that carry structure rather than data. */
const RESERVED_PREFIX = "graphty.";

/**
 * Copy every set cell of one row onto a record: each attribute column under its own name, a
 * multi-component cell as an array, an f32 cell widened as {@link cell} does. graph-format's
 * reserved `graphty.*` columns carry structure, not data, and are not copied; nor is a key the
 * record already holds, so a column named `id`, `source` or `target` cannot take their place.
 * @param table - the node or edge table
 * @param row - the row
 * @param record - receives the values
 */
export function copyColumns(table: AttributeTable, row: number, record: Record<string, unknown>): void {
    for (const column of table) {
        const { name } = column.meta;
        if (name.startsWith(RESERVED_PREFIX) || Object.hasOwn(record, name) || !column.isSet(row)) {
            continue;
        }

        record[name] = ArrayBuffer.isView(column.value(row)) ? components(column, row) : cell(column, row);
    }
}

/**
 * Rebuild the element's node and edge records from an imported graph.
 *
 * Only declared nodes become records, in declaration order, unless `allNodes` is set: the CSV
 * and JSON readers have always handed over a record for a node only an edge named too, in row
 * order. Each logical edge of the file becomes one record: when the importer expanded an edge into
 * two halves to hold a mixed-direction file, the mirror half (the one whose `pair` points at a
 * lower row) is skipped. An edge carries `weight` only when the file gave it one, at the precision
 * the importer read it with.
 * @param imported - the import
 * @param mapping - the format's mapping from rows to record keys
 * @param allNodes - a record for every node, declared or not
 * @returns the records, in file order
 */
export function toRecords(
    imported: ImportedGraph,
    mapping: RecordMapping,
    allNodes = false,
): { nodes: AdHocData[]; edges: AdHocData[] } {
    const { snapshot, declared } = imported;
    const { ids } = snapshot;

    // In the order the file declared them: a node an edge names before its declaration has an
    // earlier row than the nodes declared between the two.
    const order = allNodes ? Array.from({ length: snapshot.nodeCount }, (_, row) => ids.idOf(row)) : declared;
    const nodes: Record<string, unknown>[] = [];
    for (const id of order) {
        const record: Record<string, unknown> = { id };
        mapping.node(ids.indexOf(id), record);
        nodes.push(record);
    }

    const pair = snapshot.edges.byRole("pair");
    const weight = snapshot.edges.byRole("weight");
    const arcWeights = snapshot.flags.weighted ? snapshot.edgeList().weights : null;
    const edges: Record<string, unknown>[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (pair?.isSet(row) && (pair.value(row) as number) < row) {
            continue;
        }

        const record: Record<string, unknown> = {
            source: ids.idOf(snapshot.edgeSource(row)),
            target: ids.idOf(snapshot.edgeTarget(row)),
        };
        if (weight !== null) {
            if (weight.isSet(row)) {
                record.weight = weight.value(row);
            }
        } else if (arcWeights !== null) {
            record.weight = arcWeights[row];
        }

        mapping.edge(row, record);
        edges.push(record);
    }

    return { nodes: nodes as AdHocData[], edges: edges as AdHocData[] };
}

/**
 * The mapping that keeps every attribute under its own name and adds nothing (see {@link copyColumns}).
 * @param snapshot - the imported graph
 * @returns the mapping
 */
export function columnsMapping(snapshot: GraphSnapshot): RecordMapping {
    return {
        node: (row, record) => {
            copyColumns(snapshot.nodes, row, record);
        },
        edge: (row, record) => {
            copyColumns(snapshot.edges, row, record);
        },
    };
}
