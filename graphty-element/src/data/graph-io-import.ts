import {
    GraphBuilder,
    type GraphMeta,
    type GraphSnapshot,
    type NodeId,
    type SetDirectedOptions,
    type U32,
} from "@graphty/graph-format";
import { type CommonImportOptions, type GraphImporter, ImportError, type ImportReport } from "@graphty/graph-io";

import { GraphtyError } from "../errors";
import type { ErrorAggregator } from "./ErrorAggregator.js";

/** The graph-io edge column that links the two halves of an undirected edge in a directed snapshot. */
const PAIR_COLUMN = "graphty.pair";

/**
 * A scratch builder that remembers what the importer said, not only what it built.
 *
 * The element rebuilds its records from a frozen snapshot, and a snapshot cannot tell a node the
 * file declared from one the builder created for an edge endpoint, nor a direction the file stated
 * from the builder's starting value. Both are recorded here as the importer pushes.
 */
class RecordingBuilder extends GraphBuilder {
    /** Ids the importer added as nodes, as opposed to endpoints the builder created. */
    readonly declared = new Set<NodeId>();
    /** The direction the importer set, or null when it never set one. */
    stated: boolean | null = null;

    override addNode(id: NodeId): number {
        this.declared.add(id);
        return super.addNode(id);
    }

    override addNodes(ids: Iterable<NodeId>, out?: U32): U32 {
        const list = [...ids];
        for (const id of list) {
            this.declared.add(id);
        }

        return super.addNodes(list, out);
    }

    override setDirected(directed: boolean, options?: SetDirectedOptions): void {
        this.stated = directed;
        super.setDirected(directed, options);
    }
}

/** What {@link importRecords} read, as the plain records the element's data sources yield. */
interface ImportedRecords {
    /** One record per node: `id` and every attribute the file set on it. */
    nodes: Record<string, unknown>[];
    /** One record per edge the file wrote: `source`, `target` and every attribute set on it. */
    edges: Record<string, unknown>[];
    /** Whether each node record's id was declared by the file rather than created for an edge endpoint. */
    declared: boolean[];
    /** The snapshot's direction. */
    directed: boolean;
    /** The direction the importer set explicitly, or null when it left the builder's default. */
    stated: boolean | null;
    /** The graph-level metadata the importer recorded. */
    meta: GraphMeta;
    /** The importer's report. */
    report: ImportReport;
}

/**
 * Read a text through a graph-io importer and rebuild the records the element ingests.
 *
 * The importer writes into a scratch builder (the element's own builder holds no attribute
 * columns), which is frozen once and turned back into one record per node and per edge. An edge
 * graph-io stored as two mirrored halves is yielded once, as the file wrote it.
 *
 * Every error the importer recorded and recovered from goes into `errors`; warnings do not. An
 * input the importer could not read at all -- a syntax error, a file cut off mid-structure, the
 * error limit reached -- is thrown as an `E_PARSE_FAILED` GraphtyError whose `details.line` is
 * the line the importer blamed.
 * @param importer - the graph-io importer for the format
 * @param format - the element's name for the format, for messages
 * @param text - the file's contents
 * @param options - the importer's options
 * @param errors - where recoverable errors are recorded
 * @returns the records, the direction and the report
 */
export async function importRecords<Opts>(
    importer: GraphImporter<Opts>,
    format: string,
    text: string,
    options: Opts & CommonImportOptions,
    errors: ErrorAggregator,
): Promise<ImportedRecords> {
    const builder = new RecordingBuilder({ directed: true, addMissingNodes: true });
    let report: ImportReport;
    try {
        report = await importer.import(text, builder, options);
    } catch (error) {
        if (!(error instanceof ImportError)) {
            throw error;
        }

        const fatal = error.report.issues.filter((issue) => issue.severity === "error").at(-1);
        const line = fatal?.line ?? null;
        throw new GraphtyError({
            code: "E_PARSE_FAILED",
            source: "data",
            message: `Failed to parse ${format}${line === null ? "" : ` at line ${line}`}: ${fatal?.message ?? error.message}`,
            details: { format, line, issue: fatal?.code ?? error.code },
            cause: error,
        });
    }

    for (const issue of report.issues) {
        if (issue.severity === "error") {
            errors.addError({
                message: issue.message,
                category: issue.category,
                ...(issue.line === null ? {} : { line: issue.line }),
            });
        }
    }

    const snapshot = builder.freeze();
    return {
        ...recordsOf(snapshot, builder.declared),
        directed: snapshot.directed,
        stated: builder.stated,
        meta: snapshot.meta,
        report,
    };
}

function recordsOf(
    snapshot: GraphSnapshot,
    declared: ReadonlySet<NodeId>,
): Pick<ImportedRecords, "nodes" | "edges" | "declared"> {
    const nodeColumns = snapshot.nodes.names();
    const nodes: Record<string, unknown>[] = [];
    const isDeclared: boolean[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        const record: Record<string, unknown> = { id };
        for (const name of nodeColumns) {
            if (snapshot.nodes.isSet(name, i)) {
                record[name] = snapshot.nodes.value(name, i);
            }
        }

        nodes.push(record);
        isDeclared.push(declared.has(id));
    }

    const edgeColumns = snapshot.edges.names().filter((name) => name !== PAIR_COLUMN);
    const pairs = snapshot.edges.has(PAIR_COLUMN);
    const edges: Record<string, unknown>[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        // The second half of a mirrored pair is the same file edge again.
        if (pairs && snapshot.edges.isSet(PAIR_COLUMN, e) && Number(snapshot.edges.value(PAIR_COLUMN, e)) < e) {
            continue;
        }

        const record: Record<string, unknown> = {
            source: snapshot.ids.idOf(snapshot.edgeSource(e)),
            target: snapshot.ids.idOf(snapshot.edgeTarget(e)),
        };
        for (const name of edgeColumns) {
            if (snapshot.edges.isSet(name, e)) {
                record[name] = snapshot.edges.value(name, e);
            }
        }

        edges.push(record);
    }

    return { nodes, edges, declared: isDeclared };
}
