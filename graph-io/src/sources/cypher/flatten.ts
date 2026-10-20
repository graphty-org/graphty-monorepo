/**
 * The one result flattener of the Cypher source (design section 5): every node and relationship a
 * result holds -- in a column, a path, a list or a map -- is collected once by its element id, and
 * written to the sink as nodes (labels in the `labels` column, as the neo4j CSV importer has them)
 * and directed edges (type in `type`, element id in `id`). A result of scalars only is
 * E_SOURCE_NOT_A_GRAPH.
 */

import { type ColumnDecl, type GraphSink, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { throwIfAborted } from "../../common/input.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { failOn } from "../fail.js";
import { SOURCE_DEGREE_ATTR } from "../ids.js";
import { GraphNode, GraphRel } from "./types-map.js";

/** One query's result, every value already mapped. */
export interface QueryResult {
    /** The column names. */
    readonly fields: readonly string[];
    /** The rows, one value per column. */
    readonly rows: readonly (readonly unknown[])[];
}

/** The column names the neo4j CSV importer gives labels and types; spelled here so the Cypher chunk does not load it. */
const LABELS_COLUMN = "labels";
const TYPE_COLUMN = "type";

/** The labels column, as the neo4j CSV importer declares it. */
const LABELS_DECL: ColumnDecl = {
    name: LABELS_COLUMN,
    dtype: "list",
    itemDtype: "dict",
    nullable: true,
    role: "labels",
};

/** The relationship type column. */
const TYPE_DECL: ColumnDecl = { name: TYPE_COLUMN, dtype: "dict", nullable: true, role: "kind" };

/** The edge id column. */
const EDGE_ID_DECL: ColumnDecl = { name: "id", dtype: "string", nullable: true, role: "id" };

/** The nodes, relationships and degree hints of one or more results, each once. */
export class Collector {
    readonly nodes = new Map<string, GraphNode>();
    readonly rels = new Map<string, GraphRel>();
    /** Degree hints by the id expression's value, as text. */
    readonly degrees = new Map<string, number>();

    /**
     * Collect a result.
     * @param result - the result
     * @param hints - whether its `key` / `degree` / `degrees` columns are the generated queries' hints
     */
    add(result: QueryResult, hints: boolean): void {
        const key = hints ? result.fields.indexOf("key") : -1;
        const degree = hints ? result.fields.indexOf("degree") : -1;
        const degrees = hints ? result.fields.indexOf("degrees") : -1;
        for (const row of result.rows) {
            row.forEach((value, i) => {
                if (i === degrees && Array.isArray(value)) {
                    for (const pair of value as unknown[]) {
                        if (Array.isArray(pair) && typeof pair[1] === "number") {
                            this.degrees.set(String(pair[0]), pair[1]);
                        }
                    }
                } else if (i !== key && i !== degree) {
                    this.visit(value);
                }
            });
            if (key >= 0 && degree >= 0 && typeof row[degree] === "number") {
                this.degrees.set(String(row[key]), row[degree]);
            }
        }
    }

    /**
     * Collect every node and relationship inside a value.
     * @param value - the value
     */
    private visit(value: unknown): void {
        if (value instanceof GraphNode) {
            this.nodes.set(value.id, value);
        } else if (value instanceof GraphRel) {
            this.rels.set(value.id, value);
        } else if (Array.isArray(value)) {
            value.forEach((v) => {
                this.visit(v);
            });
        } else if (value !== null && typeof value === "object") {
            Object.values(value).forEach((v) => {
                this.visit(v);
            });
        }
    }

    /**
     * Whether nothing was collected.
     * @returns true when no node or relationship was found
     */
    get empty(): boolean {
        return this.nodes.size === 0 && this.rels.size === 0;
    }
}

/**
 * Fail with E_SOURCE_NOT_A_GRAPH when a result has rows but no node, relationship or path.
 * @param result - the result
 * @param collector - what it held
 * @param report - the load's report
 */
export function requireGraph(result: QueryResult, collector: Collector, report: ImportReportBuilder): void {
    if (result.rows.length > 0 && collector.empty) {
        failOn(report, "E_SOURCE_NOT_A_GRAPH", "the query returned no node, relationship or path", {
            columns: result.fields,
        });
    }
}

/**
 * The id a node gets: its `idProperty` value when it has one, else the server's element id.
 * @param node - the node
 * @param idProperty - the id property, or null
 * @returns the id
 */
function nodeIdOf(node: GraphNode, idProperty: string | null): NodeId {
    const value = idProperty === null ? undefined : node.properties[idProperty];
    return typeof value === "string" || typeof value === "number" ? value : node.id;
}

/**
 * A column handle, declared on first use.
 * @param sink - the sink
 * @param decl - the declaration
 * @param domain - node or edge
 * @returns the handle
 */
function column(sink: GraphSink, decl: ColumnDecl, domain: "node" | "edge"): ReturnType<GraphSink["nodeColumn"]> {
    const existing = domain === "node" ? sink.nodeColumn(decl.name) : sink.edgeColumn(decl.name);
    if (existing !== INVALID_INDEX) {
        return existing;
    }
    return domain === "node" ? sink.declareNodeColumn(decl) : sink.declareEdgeColumn(decl);
}

/**
 * Write what was collected into the sink. A node already in the sink is updated, not counted again.
 * @param c - the collector
 * @param sink - the sink
 * @param idProperty - the id property, or null
 * @param report - the load's report
 * @param signal - the load's signal
 */
export function writeCollected(
    c: Collector,
    sink: GraphSink,
    idProperty: string | null,
    report: ImportReportBuilder,
    signal: AbortSignal,
): void {
    if (sink.edgeCount === 0 && !sink.directedLocked && !sink.directed) {
        sink.setDirected(true);
    }
    const ids = writeNodes(c, sink, idProperty, report, signal);
    writeRels(c, sink, ids, report, signal, c.nodes.size);
}

/**
 * Write the collected nodes into the sink.
 * @param c - the collector
 * @param sink - the sink
 * @param idProperty - the id property, or null
 * @param report - the load's report
 * @param signal - the load's signal
 * @returns each element id's node id
 */
function writeNodes(
    c: Collector,
    sink: GraphSink,
    idProperty: string | null,
    report: ImportReportBuilder,
    signal: AbortSignal,
): Map<string, NodeId> {
    const ids = new Map<string, NodeId>();
    let n = 0;
    for (const node of c.nodes.values()) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        const id = nodeIdOf(node, idProperty);
        ids.set(node.id, id);
        const degree = c.degrees.get(String(idProperty === null ? node.id : id));
        try {
            const fresh = sink.indexOf(id) === INVALID_INDEX;
            const index = sink.addNodeRecord(
                id,
                degree === undefined ? node.properties : { ...node.properties, [SOURCE_DEGREE_ATTR]: degree },
            );
            sink.setNodeValue(column(sink, LABELS_DECL, "node"), index, node.labels);
            if (fresh) {
                report.counts.nodes++;
            }
        } catch (err) {
            report.recordError(err, { element: String(id) });
            report.counts.skippedNodes++;
        }
    }
    return ids;
}

/**
 * Write the collected relationships into the sink, adding any end the result did not return.
 * @param c - the collector
 * @param sink - the sink
 * @param ids - each element id's node id
 * @param report - the load's report
 * @param signal - the load's signal
 * @param written - how many elements were written before, for the abort check cadence
 */
function writeRels(
    c: Collector,
    sink: GraphSink,
    ids: Map<string, NodeId>,
    report: ImportReportBuilder,
    signal: AbortSignal,
    written: number,
): void {
    let n = written;
    for (const rel of c.rels.values()) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        // an end the result did not return is known only by its element id
        const s = ids.get(rel.start) ?? rel.start;
        const t = ids.get(rel.end) ?? rel.end;
        try {
            for (const end of [s, t]) {
                if (sink.indexOf(end) === INVALID_INDEX) {
                    sink.addNode(end);
                    report.counts.nodes++;
                }
            }
            const e = sink.addEdgeRecord(s, t, rel.properties, null);
            sink.setEdgeValue(column(sink, TYPE_DECL, "edge"), e, rel.type);
            sink.setEdgeValue(column(sink, EDGE_ID_DECL, "edge"), e, rel.id);
            report.counts.edges++;
        } catch (err) {
            report.recordError(err, { element: `${String(s)} -> ${String(t)}` });
            report.counts.skippedEdges++;
        }
    }
}

/**
 * Code-unit order of two strings, independent of locale.
 * @param a - one string
 * @param b - another
 * @returns negative, zero or positive
 */
export function compareText(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a < b ? -1 : 1;
}

/**
 * One canonical object member.
 * @param key - the key
 * @param value - the value
 * @returns `"key":value`
 */
function member(key: string, value: unknown): string {
    return `${JSON.stringify(key)}:${canonical(value)}`;
}

/**
 * JSON with every object's keys sorted, so equal data spells the same.
 * @param value - the value
 * @returns the canonical text
 */
function canonical(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(canonical).join(",")}]`;
    }
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value).sort(([a], [b]) => compareText(a, b));
        const members = entries.map(([k, v]) => member(k, v));
        return `{${members.join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}

/**
 * The canonical rows of what was collected: one line per node and relationship, sorted, for the
 * content hash `validate` compares.
 * @param c - the collector
 * @param idProperty - the id property, or null
 * @returns the lines
 */
export function canonicalRows(c: Collector, idProperty: string | null): string[] {
    const ids = new Map<string, NodeId>();
    const lines: string[] = [];
    for (const node of c.nodes.values()) {
        const id = nodeIdOf(node, idProperty);
        ids.set(node.id, id);
        lines.push(canonical(["n", id, [...node.labels].sort(compareText), node.properties]));
    }
    for (const rel of c.rels.values()) {
        lines.push(
            canonical([
                "r",
                rel.id,
                ids.get(rel.start) ?? rel.start,
                ids.get(rel.end) ?? rel.end,
                rel.type,
                rel.properties,
            ]),
        );
    }
    return lines;
}
