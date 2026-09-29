import { type Column, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    formatF32,
    type GraphImporter,
    ImportError,
    type ImportReport,
} from "@graphty/graph-io";

import type { AdHocData } from "../config/common.js";
import { GraphtyError } from "../errors/GraphtyError.js";
import type { ErrorAggregator } from "./ErrorAggregator.js";

/**
 * A scratch builder that remembers which nodes the file itself declared.
 *
 * An importer adds a node through `addNode` when the file declares it; a node an edge names but
 * the file never declared is created by the builder inside `addEdge`. The element has always
 * yielded only the declared ones and let the store create the rest, so the difference is kept.
 */
class DeclaringBuilder extends GraphBuilder {
    readonly declared = new Set<NodeId>();

    override addNode(id: NodeId): number {
        const row = super.addNode(id);
        this.declared.add(id);
        return row;
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
 * report holds one of the `fatal` codes, still throws: a `GraphtyError` with `E_PARSE_FAILED`
 * naming the format and the line, whose `cause` is the importer's `ImportError`.
 * @param importer - the graph-io importer for the format
 * @param text - the whole document
 * @param options - importer options; `ids` defaults to "string", so ids stay the text the file wrote
 * @param fatal - issue codes that make even a recognisable document unreadable
 * @returns the snapshot, the report and the declared node ids
 */
export async function importDocument<Opts>(
    importer: GraphImporter<Opts>,
    text: string,
    options: Opts & CommonImportOptions,
    fatal: readonly string[] = [],
): Promise<ImportedGraph> {
    const builder = new DeclaringBuilder({ directed: false, weightDtype: "f64" });
    let report: ImportReport;
    try {
        report = await importer.import(text, builder, { ids: "string", ...options });
    } catch (error) {
        const recognised = importer.sniff?.(new TextEncoder().encode(text.slice(0, 4096))) ?? 0;
        if (!(error instanceof ImportError)) {
            throw error;
        }

        if (recognised === 0 || error.report.issues.some((issue) => fatal.includes(issue.code))) {
            const line = error.report.issues.filter((issue) => issue.severity === "error").at(-1)?.line ?? null;
            throw GraphtyError.wrap(error, {
                code: "E_PARSE_FAILED",
                source: "data",
                message: `Failed to read the ${importer.format} file${line === null ? "" : ` at line ${line}`}: ${error.message}`,
                details: { format: importer.format, line, errors: error.report.errorCount },
            });
        }

        ({ report } = error);
    }

    return { snapshot: builder.freeze(), report, declared: builder.declared };
}

/**
 * Copy the errors of an import report into the source's aggregator.
 *
 * Warnings stay in the report: the aggregator has always counted only what went wrong, and a
 * warning is something the importer read and kept.
 * @param report - the importer's report
 * @param errors - the data source's aggregator
 */
export function aggregateErrors(report: ImportReport, errors: ErrorAggregator): void {
    for (const issue of report.issues) {
        if (issue.severity !== "error") {
            continue;
        }

        errors.addError({
            message: issue.message,
            category: issue.category,
            ...(issue.line === null ? {} : { line: issue.line }),
            ...(issue.element === null ? {} : { field: issue.element }),
        });
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

/**
 * Rebuild the element's node and edge records from an imported graph.
 *
 * Only declared nodes become records, in declaration order. Each logical edge of the file becomes one record: when the
 * importer expanded an edge into two halves to hold a mixed-direction file, the mirror half (the
 * one whose `pair` points at a lower row) is skipped. An edge carries `weight` only when the file
 * gave it one, at the precision the importer read it with.
 * @param imported - the import
 * @param mapping - the format's mapping from rows to record keys
 * @returns the records, in file order
 */
export function toRecords(imported: ImportedGraph, mapping: RecordMapping): { nodes: AdHocData[]; edges: AdHocData[] } {
    const { snapshot, declared } = imported;
    const { ids } = snapshot;

    // In the order the file declared them: a node an edge names before its declaration has an
    // earlier row than the nodes declared between the two.
    const nodes: Record<string, unknown>[] = [];
    for (const id of declared) {
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
