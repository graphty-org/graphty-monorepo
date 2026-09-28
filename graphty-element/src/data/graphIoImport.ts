/**
 * @file Reading a file through a graph-io importer and handing back the records the element reads.
 *
 * The importer fills a scratch builder, the builder is frozen, and the snapshot is turned back
 * into plain node and edge records -- the shape every data source has always yielded and the
 * DataManager has always consumed. The importer's report goes to the source's `ErrorAggregator`
 * and the direction the file stated goes to `declareDirection`, so a load cannot tell which path
 * its records came by.
 *
 * The records keep the file's own names: every attribute column under its name, the node id under
 * `id`, the endpoints under `source` and `target`, and the weight under the attribute the file
 * wrote it in. graph-format's reserved `graphty.*` columns carry structure, not data, and are not
 * copied. Where a format's reader used to spell something differently, its {@link RecordMapping}
 * puts the old spelling back.
 */

import { type AttributeTable, GraphBuilder, type GraphSnapshot, type NodeId, type U32 } from "@graphty/graph-format";
import { type CommonImportOptions, type GraphImporter, ImportError, type ImportReport } from "@graphty/graph-io";

import type { AdHocData } from "../config";
import { GraphtyError } from "../errors";
import type { DeclaredDirection } from "./DataSource";
import type { ErrorAggregator } from "./ErrorAggregator";

/** One node or edge record, before it is handed to the element. */
type ImportRecord = Record<string, unknown>;

/** How one format's records differ from the ones this helper builds. */
export interface RecordMapping {
    /** Rewrite a node record; `index` is the node's row in `snapshot`. */
    node?: (record: ImportRecord, index: number, snapshot: GraphSnapshot) => ImportRecord;
    /** Rewrite an edge record; `index` is the edge's row in `snapshot`. */
    edge?: (record: ImportRecord, index: number, snapshot: GraphSnapshot) => ImportRecord;
    /**
     * What the file said about its direction, or null when it said nothing. By default the
     * snapshot's direction, stated by the file, with every edge the importer had to expand
     * counted as a conflict.
     */
    direction?: (snapshot: GraphSnapshot, report: ImportReport) => DeclaredDirection | null;
}

/** What {@link importRecords} read. */
interface ImportedRecords {
    readonly nodes: AdHocData[];
    readonly edges: AdHocData[];
    readonly direction: DeclaredDirection | null;
}

/** Options handed to the importer: the common ones and the format's own. */
export type ImporterOptions = CommonImportOptions & Record<string, unknown>;

/** The prefix graph-format reserves for the columns that carry structure rather than data. */
const RESERVED_PREFIX = "graphty.";

/**
 * A builder that remembers which nodes the file declared, as opposed to the ones only an edge
 * named: the element's readers never handed over a record for the second kind.
 */
class DeclaringBuilder extends GraphBuilder {
    readonly declared = new Set<number>();

    override addNode(id: NodeId): number {
        const index = super.addNode(id);
        this.declared.add(index);
        return index;
    }

    override addNodes(ids: Iterable<NodeId>, out?: U32): U32 {
        const list = [...ids];
        const indices = super.addNodes(list, out);
        for (let i = 0; i < list.length; i++) {
            this.declared.add(indices[i]);
        }

        return indices;
    }
}

/**
 * Copy one row of an attribute table into a record, skipping unset cells and reserved columns.
 * @param table - the node or edge table
 * @param row - the row
 * @param record - receives the values
 * @param weightKey - the key the weight role column is written under, or null for a node table
 */
function copyRow(table: AttributeTable, row: number, record: ImportRecord, weightKey: string | null): void {
    for (const column of table) {
        const { name, role } = column.meta;
        let key = name;
        if (weightKey !== null && role === "weight") {
            key = weightKey;
        } else if (name.startsWith(RESERVED_PREFIX)) {
            continue;
        }

        const value = column.value(row);
        if (value === undefined) {
            continue;
        }

        // A multi-component cell is a view into the column; a record owns its values.
        record[key] = ArrayBuffer.isView(value) ? Array.from(value as Float64Array) : value;
    }
}

/**
 * Add every error of an import report to the aggregator. Warnings do not count toward graph-io's
 * error limit, so they do not count toward the element's either.
 * @param report - the importer's report
 * @param aggregator - the source's aggregator
 */
function aggregate(report: ImportReport, aggregator: ErrorAggregator): void {
    for (const issue of report.issues) {
        if (issue.severity === "error") {
            aggregator.addError({
                message: issue.message,
                category: issue.category,
                ...(issue.line === null ? {} : { line: issue.line }),
            });
        }
    }
}

/**
 * Run an importer over `input` and return the records the element reads.
 * @param importer - the graph-io importer for the format
 * @param input - the file's text
 * @param aggregator - receives the importer's errors
 * @param options - importer options; `errorLimit` defaults to the aggregator's
 * @param mapping - the format's differences from the default records
 * @returns the node and edge records and the direction the file stated
 * @throws A `GraphtyError` with `E_PARSE_FAILED` when the importer gave up on the file.
 */
export async function importRecords(
    importer: GraphImporter,
    input: string,
    aggregator: ErrorAggregator,
    options: ImporterOptions = {},
    mapping: RecordMapping = {},
): Promise<ImportedRecords> {
    // The same seed graph-io's own importGraph() uses: directed until the file says otherwise.
    const builder = new DeclaringBuilder({
        directed: true,
        weightDtype: options.weightDtype ?? "f64",
        addMissingNodes: options.addMissingNodes ?? true,
        duplicateEdges: options.duplicateEdges ?? "keep",
        selfLoops: options.selfLoops ?? "keep",
    });

    let report: ImportReport;
    try {
        report = await importer.import(input, builder, { errorLimit: aggregator.getErrorLimit(), ...options });
    } catch (error) {
        if (!(error instanceof ImportError)) {
            throw error;
        }

        aggregate(error.report, aggregator);
        const last = error.report.issues.filter((issue) => issue.severity === "error").at(-1);
        const line = last?.line ?? null;
        throw GraphtyError.wrap(error, {
            code: "E_PARSE_FAILED",
            source: "data",
            message: `Failed to read the ${importer.format} file${line === null ? "" : ` at line ${line}`}: ${error.message}`,
            details: { format: importer.format, line, errors: error.report.errorCount },
        });
    }

    aggregate(report, aggregator);
    const snapshot = builder.freeze();
    const { ids } = snapshot;

    const nodes: ImportRecord[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        if (!builder.declared.has(i)) {
            continue;
        }

        const record: ImportRecord = {};
        copyRow(snapshot.nodes, i, record, null);
        record.id = ids.idOf(i);
        nodes.push(mapping.node ? mapping.node(record, i, snapshot) : record);
    }

    const origin = snapshot.meta.weightOrigin;
    const weightKey = origin?.title ?? origin?.id ?? "weight";
    const { src, dst } = snapshot.edgeList();
    const edges: ImportRecord[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const record: ImportRecord = {};
        copyRow(snapshot.edges, e, record, weightKey);
        record.source = ids.idOf(src[e]);
        record.target = ids.idOf(dst[e]);
        edges.push(mapping.edge ? mapping.edge(record, e, snapshot) : record);
    }

    const direction = mapping.direction
        ? mapping.direction(snapshot, report)
        : {
              directed: snapshot.directed,
              statedBy: `the ${importer.format} file`,
              conflictingEdges: report.counts.expandedMixed,
          };

    return { nodes: nodes as AdHocData[], edges: edges as AdHocData[], direction };
}
