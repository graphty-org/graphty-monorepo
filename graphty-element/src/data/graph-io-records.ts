import { type ColumnHandle, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    type GraphImporter,
    ImportError,
    type ImportInput,
    type ImportReport,
} from "@graphty/graph-io";

import type { ErrorAggregator } from "./ErrorAggregator";

/** The exact shadow column a freeze writes an edge weight to when f32 cannot hold it. */
const WEIGHT_COLUMN_NAME = "graphty.weight";

/** One node or edge record, in the shape the element's data bags hold. */
export type ImportedRecord = Record<string, unknown>;

/**
 * One imported node: its id, and every attribute the file set on it.
 *
 * The id is kept apart from the attributes because a file may carry an attribute under the very
 * key the element reads the id from (a JSON node whose id is `name` and which also has an `id`
 * value); each data source decides which key the id goes under.
 */
export interface ImportedNode {
    /** The node id. */
    readonly id: NodeId;
    /** Every attribute the file set. */
    readonly data: ImportedRecord;
}

/** One imported edge: its endpoints, and every attribute the file set on it. See {@link ImportedNode}. */
export interface ImportedEdge {
    /** The source node id. */
    readonly source: NodeId;
    /** The target node id. */
    readonly target: NodeId;
    /** Every attribute the file set, plus `weight` when the importer read a weight for it. */
    readonly data: ImportedRecord;
}

/** What a graph-io import yields once it is turned back into element records. */
export interface ImportedRecords {
    /** One entry per node, in node index order. */
    readonly nodes: ImportedNode[];
    /** One entry per logical edge, in insertion order. */
    readonly edges: ImportedEdge[];
    /** The importer's report, also when it aborted. */
    readonly report: ImportReport;
    /** Whether the importer aborted (a fatal issue, or its error limit): the records are then empty. */
    readonly aborted: boolean;
}

/**
 * A builder that keeps the FIRST value a node's attribute is given, as the element does.
 *
 * The element keeps the first record of a repeated node id and skips the rest; graph-io merges a
 * repeated node row into the node it already read, the later values winning. A cell written once
 * is therefore not written again. A repeated row can still fill a cell the first row left empty.
 */
class FirstValueBuilder extends GraphBuilder {
    private readonly written = new Map<number, Set<number>>();

    override setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void {
        const handle = typeof column === "string" ? this.nodeColumn(column) : column;
        if (this.written.get(handle)?.has(index) === true) {
            return;
        }

        super.setNodeValue(column, index, value);
        const declared = typeof column === "string" ? this.nodeColumn(column) : column;
        let rows = this.written.get(declared);
        if (rows === undefined) {
            rows = new Set();
            this.written.set(declared, rows);
        }

        rows.add(index);
    }
}

/**
 * Copy every set attribute cell of one table row onto a new record.
 * @param snapshot - the frozen import
 * @param table - which table
 * @param row - the node or edge index
 * @returns the record
 */
function rowOf(snapshot: GraphSnapshot, table: "nodes" | "edges", row: number): ImportedRecord {
    const record: ImportedRecord = {};
    for (const column of snapshot[table]) {
        if (column.meta.name !== WEIGHT_COLUMN_NAME && column.isSet(row)) {
            record[column.meta.name] = column.value(row);
        }
    }

    return record;
}

/**
 * Turn a frozen import back into the records the element's data bags hold.
 *
 * An edge's weight is read from the exact shadow column when the freeze wrote one, and from the
 * f32 weight array otherwise: the freeze leaves the shadow column out when every weight survives
 * the narrowing to f32, so the array is then the only place the weight is.
 * @param snapshot - the frozen import
 * @returns the nodes and edges
 */
function recordsOf(snapshot: GraphSnapshot): { nodes: ImportedNode[]; edges: ImportedEdge[] } {
    const nodes: ImportedNode[] = [];
    for (let node = 0; node < snapshot.nodeCount; node++) {
        nodes.push({ id: snapshot.ids.idOf(node), data: rowOf(snapshot, "nodes", node) });
    }

    const { src, dst, weights } = snapshot.edgeList();
    const exactWeight = snapshot.edges.get(WEIGHT_COLUMN_NAME);
    const edges: ImportedEdge[] = [];
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        const data = rowOf(snapshot, "edges", edge);
        if (exactWeight?.isSet(edge)) {
            data.weight = exactWeight.value(edge);
        } else if (weights !== null) {
            data.weight = weights[edge];
        }

        edges.push({ source: snapshot.ids.idOf(src[edge]), target: snapshot.ids.idOf(dst[edge]), data });
    }

    return { nodes, edges };
}

/**
 * Run a graph-io importer into a scratch builder and hand back the records the element consumes.
 *
 * The scratch builder is directed, keeps parallel edges and self-loops and adds the endpoints an
 * edge names, so every record the file holds comes back once, in file order, with the endpoints
 * the file wrote. Direction is not read from it: each data source declares what its format
 * states. An importer that aborts -- an empty input, an unclosed quote, a header that names no
 * column it can read -- does not throw here; its report is returned with `aborted` set, so the
 * caller can record the issues and yield nothing, as every reader in the element has always done.
 * @param importer - the graph-io importer
 * @param input - the text to read
 * @param options - the importer's options
 * @returns the records and the report
 */
export async function importRecords<O>(
    importer: GraphImporter<O>,
    input: ImportInput,
    options: O & CommonImportOptions,
): Promise<ImportedRecords> {
    const builderOptions = {
        directed: true,
        addMissingNodes: true,
        duplicateEdges: "keep",
        selfLoops: "keep",
        weightDtype: "f64",
    } as const;
    const builder = new FirstValueBuilder(builderOptions);

    let report: ImportReport;
    try {
        report = await importer.import(input, builder, options);
    } catch (error) {
        if (error instanceof ImportError) {
            return { nodes: [], edges: [], report: error.report, aborted: true };
        }

        throw error;
    }

    return { ...recordsOf(builder.freeze()), report, aborted: false };
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
 * Record an import report's errors in a data source's error aggregator.
 *
 * Only errors are recorded. Warnings did not reach the aggregator before either -- a header with
 * no rows, a column renamed because its name was taken -- and the aggregator's count is what
 * decides whether a load is reported as having failed rows.
 * @param report - the importer's report
 * @param aggregator - the data source's aggregator
 * @throws Error when the aggregator's error limit is reached, as every reader does
 */
export function recordIssues(report: ImportReport, aggregator: ErrorAggregator): void {
    for (const issue of report.issues) {
        if (issue.severity !== "error") {
            continue;
        }

        const message =
            issue.code === "E_MISSING_ENDPOINT" ? `${missingEndpoint(issue.message)}: ${issue.message}` : issue.message;
        const canContinue = aggregator.addError({
            message,
            category: issue.category,
            ...(issue.line === null ? {} : { line: issue.line }),
            ...(issue.element === null ? {} : { field: issue.element }),
        });

        if (!canContinue) {
            throw new Error(`Too many errors (${aggregator.getErrorCount()}), aborting parse`);
        }
    }
}
