import { type ColumnHandle, GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    type GraphImporter,
    ImportError,
    type ImportInput,
    type ImportReport,
} from "@graphty/graph-io";

import type { ErrorAggregator } from "./ErrorAggregator";

/** One node or edge record, in the shape the element's data bags hold. */
export type ImportedRecord = Record<string, unknown>;

/** What a graph-io import yields once it is turned back into element records. */
export interface ImportedRecords {
    /** One record per node, in node index order: `id` plus every attribute the file set. */
    readonly nodes: ImportedRecord[];
    /** One record per logical edge, in insertion order: `source`, `target` plus every attribute. */
    readonly edges: ImportedRecord[];
    /** The importer's report, also when it aborted. */
    readonly report: ImportReport;
    /** Whether the importer aborted (a fatal issue, or its error limit): the records are then empty. */
    readonly aborted: boolean;
}

/**
 * A builder that stores every attribute it was not told the type of as a `json` column, so a value
 * reaches the element exactly as the file held it.
 *
 * The default builder infers one dtype per column and widens it to fit every row, which is right
 * for a text format (a CSV cell has no type until one is inferred) and wrong for JSON, whose
 * values already have one: a `value` key holding 42 in one record and "n/a" in another would come
 * back as the strings "42" and "n/a", and a schema the caller validates records against would
 * reject the record the file wrote correctly.
 */
class VerbatimBuilder extends GraphBuilder {
    override setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void {
        if (
            typeof column === "string" &&
            value !== undefined &&
            value !== null &&
            this.nodeColumn(column) === INVALID_INDEX
        ) {
            this.declareNodeColumn({ name: column, dtype: "json" });
        }

        super.setNodeValue(column, index, value);
    }

    override setEdgeValue(column: ColumnHandle | string, edge: number, value: unknown): void {
        if (
            typeof column === "string" &&
            value !== undefined &&
            value !== null &&
            this.edgeColumn(column) === INVALID_INDEX
        ) {
            this.declareEdgeColumn({ name: column, dtype: "json" });
        }

        super.setEdgeValue(column, edge, value);
    }
}

/**
 * Copy every set cell of one table row onto a record.
 * @param snapshot - the frozen import
 * @param table - which table
 * @param row - the node or edge index
 * @param record - the record to fill
 * @returns the record
 */
function fillRow(
    snapshot: GraphSnapshot,
    table: "nodes" | "edges",
    row: number,
    record: ImportedRecord,
): ImportedRecord {
    for (const column of snapshot[table]) {
        if (column.isSet(row)) {
            record[column.meta.name] = column.value(row);
        }
    }

    return record;
}

/**
 * Turn a frozen import back into the records the element's data bags hold.
 * @param snapshot - the frozen import
 * @returns the node and edge records
 */
function recordsOf(snapshot: GraphSnapshot): { nodes: ImportedRecord[]; edges: ImportedRecord[] } {
    const nodes: ImportedRecord[] = [];
    for (let node = 0; node < snapshot.nodeCount; node++) {
        nodes.push(fillRow(snapshot, "nodes", node, { id: snapshot.ids.idOf(node) }));
    }

    const { src, dst } = snapshot.edgeList();
    const edges: ImportedRecord[] = [];
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        edges.push(
            fillRow(snapshot, "edges", edge, {
                source: snapshot.ids.idOf(src[edge]),
                target: snapshot.ids.idOf(dst[edge]),
            }),
        );
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
 * @param verbatim - store untyped attributes as `json` columns (for formats whose values are typed)
 * @returns the records and the report
 */
export async function importRecords<O>(
    importer: GraphImporter<O>,
    input: ImportInput,
    options: O & CommonImportOptions,
    verbatim = false,
): Promise<ImportedRecords> {
    const builderOptions = {
        directed: true,
        addMissingNodes: true,
        duplicateEdges: "keep",
        selfLoops: "keep",
        weightDtype: "f64",
    } as const;
    const builder = verbatim ? new VerbatimBuilder(builderOptions) : new GraphBuilder(builderOptions);

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
 * @param skip - issue codes the caller has already answered, which are not recorded
 * @throws Error when the aggregator's error limit is reached, as every reader does
 */
export function recordIssues(
    report: ImportReport,
    aggregator: ErrorAggregator,
    skip: ReadonlySet<string> = new Set(),
): void {
    for (const issue of report.issues) {
        if (issue.severity !== "error" || skip.has(issue.code)) {
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
