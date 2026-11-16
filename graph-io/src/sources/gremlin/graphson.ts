/**
 * Reading Gremlin results as a graph. A result is GraphSON 3 (typed, `{ "@type", "@value" }`), and
 * untyped GraphSON is read too. Every vertex, edge and path inside it -- at any depth, in a list,
 * a map or a path -- is collected once by its id, and so is every `elementMap()` /
 * `valueMap(true)` map (a map holding the `T.id` and `T.label` tokens; with `Direction` keys it
 * is an edge). Then the collection is written to a sink: vertex labels in the `labels` column
 * and edge labels in `type`, as the neo4j CSV importer and the Cypher source have them, edge ids
 * in `id`.
 */

import { type ColumnDecl, type GraphSink, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { throwIfAborted } from "../../common/input.js";
import { type ImportReportBuilder } from "../../common/report.js";
import { jsonText } from "../../common/text.js";

/** The keys a typed map's `T` and `Direction` tokens become, apart from any property name. */
const T_ID = "~id";
const T_LABEL = "~label";
const D_IN = "~in";
const D_OUT = "~out";

/** The typed numbers: integers, floats, and dates as epoch milliseconds. */
const NUMBER_TYPES: ReadonlySet<string> = new Set([
    "g:Int32",
    "g:Int64",
    "g:Float",
    "g:Double",
    "g:Date",
    "g:Timestamp",
    "gx:Byte",
    "gx:Int16",
    "gx:BigInteger",
    "gx:BigDecimal",
]);

/** Each token's key, by `@type` and `@value`. */
const TOKENS: ReadonlyMap<string, string> = new Map([
    ["g:T:id", T_ID],
    ["g:T:label", T_LABEL],
    ["g:Direction:IN", D_IN],
    ["g:Direction:OUT", D_OUT],
]);

/** A vertex. */
interface Vertex {
    readonly id: NodeId;
    readonly label: string | null;
    readonly properties: Readonly<Record<string, unknown>>;
    /** Known only as an edge's end. */
    readonly stub: boolean;
}

/** An edge. */
interface Edge {
    readonly id: string | null;
    readonly source: NodeId;
    readonly target: NodeId;
    readonly label: string | null;
    readonly properties: Readonly<Record<string, unknown>>;
}

/** A plain object, not an array. */
type Obj = Readonly<Record<string, unknown>>;

/**
 * Whether a value is a plain object.
 * @param v - the value
 * @returns true for a non-null, non-array object
 */
function isObj(v: unknown): v is Obj {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * A vertex id as a node id: numbers and strings as they are, anything else as its JSON text.
 * @param v - the decoded id
 * @returns the node id
 */
function nodeId(v: unknown): NodeId {
    return typeof v === "number" || typeof v === "string" ? v : (jsonText(v) ?? "null");
}

/**
 * An edge id as text: JanusGraph's relation identifier by its `relationId`.
 * @param v - the decoded id
 * @returns the id, or null
 */
function edgeId(v: unknown): string | null {
    if (v === undefined || v === null) {
        return null;
    }
    if (isObj(v) && typeof v.relationId === "string") {
        return v.relationId;
    }
    return typeof v === "string" ? v : (jsonText(v) ?? null);
}

/**
 * A label, or null.
 * @param v - the decoded label
 * @returns the label
 */
function labelOf(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

/** Every vertex and edge of one or more results, each once. */
export class Elements {
    readonly vertices = new Map<string, Vertex>();
    readonly edges = new Map<string, Edge>();

    /**
     * Collect every element inside a result value.
     * @param value - one item of a result, as the server sent it
     */
    add(value: unknown): void {
        this.decode(value);
    }

    /**
     * Whether nothing was collected.
     * @returns true when no vertex or edge was found
     */
    get empty(): boolean {
        return this.vertices.size === 0 && this.edges.size === 0;
    }

    /**
     * Keep a vertex; a full one replaces a stub, a stub never replaces anything.
     * @param v - the vertex
     */
    private vertex(v: Vertex): void {
        const key = `${typeof v.id}:${String(v.id)}`;
        if (!v.stub || !this.vertices.has(key)) {
            if (!v.stub || this.vertices.get(key)?.stub !== false) {
                this.vertices.set(key, v);
            }
        }
    }

    /**
     * Keep an edge and stubs of its ends.
     * @param e - the edge
     * @param sourceLabel - the source vertex's label, if known
     * @param targetLabel - the target vertex's label, if known
     */
    private edge(e: Edge, sourceLabel: string | null, targetLabel: string | null): void {
        const key = e.id ?? `${String(e.source)}->${String(e.target)}:${String(e.label)}`;
        this.edges.set(key, e);
        this.vertex({ id: e.source, label: sourceLabel, properties: {}, stub: true });
        this.vertex({ id: e.target, label: targetLabel, properties: {}, stub: true });
    }

    /**
     * Decode a value to plain data, collecting the elements it holds.
     * @param v - the value
     * @returns the plain value
     */
    private decode(v: unknown): unknown {
        if (Array.isArray(v)) {
            return v.map((x) => this.decode(x));
        }
        if (!isObj(v)) {
            return v;
        }
        if (typeof v["@type"] === "string" && "@value" in v) {
            return this.typed(v["@type"], v["@value"]);
        }
        // untyped GraphSON elements
        if ((v.type === "vertex" || v.type === "edge") && "id" in v && "label" in v) {
            return v.type === "vertex" ? this.readVertex(v) : this.readEdge(v);
        }
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v)) {
            out[k] = this.decode(x);
        }
        return out;
    }

    /**
     * Decode one typed value.
     * @param type - its `@type`
     * @param value - its `@value`
     * @returns the plain value
     */
    private typed(type: string, value: unknown): unknown {
        if (NUMBER_TYPES.has(type)) {
            return typeof value === "number" ? value : Number(value);
        }
        const list = Array.isArray(value) ? value : [];
        const obj = isObj(value) ? value : null;
        switch (type) {
            case "g:List":
            case "g:Set":
                return list.map((x) => this.decode(x));
            case "g:BulkSet":
                // item, count, item, count: each item once
                return list.filter((_, i) => i % 2 === 0).map((x) => this.decode(x));
            case "g:Map":
                return this.map(list);
            case "g:Vertex":
                return obj && this.readVertex(obj);
            case "g:Edge":
                return obj && this.readEdge(obj);
            case "g:Path":
                return obj && this.decode(obj.objects);
            case "g:VertexProperty":
            case "g:Property":
            case "g:Traverser":
                return obj && this.decode(obj.value);
            case "g:T":
            case "g:Direction":
                return TOKENS.get(`${type}:${String(value)}`) ?? value;
            default:
                return this.decode(value);
        }
    }

    /**
     * Decode a typed map (key, value, key, value); one holding the id and label tokens is an element.
     * @param pairs - the flat pairs
     * @returns the plain object, keyed by each key's text
     */
    private map(pairs: readonly unknown[]): Obj {
        const out: Record<string, unknown> = {};
        for (let i = 0; i + 1 < pairs.length; i += 2) {
            const k = this.decode(pairs[i]);
            out[typeof k === "string" ? k : (jsonText(k) ?? "")] = this.decode(pairs[i + 1]);
        }
        if (T_ID in out && T_LABEL in out) {
            this.readMap(out);
        }
        return out;
    }

    /**
     * Collect an `elementMap()` / `valueMap(true)` map: an edge when it has both directions.
     * @param m - the decoded map
     */
    private readMap(m: Obj): void {
        const properties: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(m)) {
            if (k !== T_ID && k !== T_LABEL && k !== D_IN && k !== D_OUT) {
                // valueMap() lists every value; one value is the value
                properties[k] = Array.isArray(v) && v.length === 1 ? v[0] : v;
            }
        }
        const label = labelOf(m[T_LABEL]);
        const inV = m[D_IN];
        const outV = m[D_OUT];
        if (isObj(inV) && isObj(outV)) {
            this.edge(
                { id: edgeId(m[T_ID]), source: nodeId(outV[T_ID]), target: nodeId(inV[T_ID]), label, properties },
                labelOf(outV[T_LABEL]),
                labelOf(inV[T_LABEL]),
            );
        } else {
            this.vertex({ id: nodeId(m[T_ID]), label, properties, stub: false });
        }
    }

    /**
     * Collect a vertex (`properties` maps a key to a list of vertex properties).
     * @param v - the vertex's `@value`, or an untyped vertex
     * @returns the vertex id, as the vertex's plain value
     */
    private readVertex(v: Obj): NodeId {
        const id = nodeId(this.decode(v.id));
        const properties: Record<string, unknown> = {};
        if (isObj(v.properties)) {
            for (const [k, list] of Object.entries(v.properties)) {
                const values = (Array.isArray(list) ? list : [list]).map((p) =>
                    // untyped: { id, value }; typed: a g:VertexProperty
                    isObj(p) && !("@type" in p) && "value" in p ? this.decode(p.value) : this.decode(p),
                );
                properties[k] = values.length === 1 ? values[0] : values;
            }
        }
        this.vertex({ id, label: labelOf(this.decode(v.label)), properties, stub: false });
        return id;
    }

    /**
     * Collect an edge (`properties` maps a key to one property).
     * @param e - the edge's `@value`, or an untyped edge
     * @returns the edge id, as the edge's plain value
     */
    private readEdge(e: Obj): string | null {
        const id = edgeId(this.decode(e.id));
        const properties: Record<string, unknown> = {};
        if (isObj(e.properties)) {
            for (const [k, p] of Object.entries(e.properties)) {
                properties[k] = this.decode(p);
            }
        }
        this.edge(
            {
                id,
                source: nodeId(this.decode(e.outV)),
                target: nodeId(this.decode(e.inV)),
                label: labelOf(this.decode(e.label)),
                properties,
            },
            labelOf(this.decode(e.outVLabel)),
            labelOf(this.decode(e.inVLabel)),
        );
        return id;
    }
}

/** The labels column, as the neo4j CSV importer declares it. */
const LABELS_DECL: ColumnDecl = { name: "labels", dtype: "list", itemDtype: "dict", nullable: true, role: "labels" };

/** The edge label column. */
const TYPE_DECL: ColumnDecl = { name: "type", dtype: "dict", nullable: true, role: "kind" };

/** The edge id column. */
const EDGE_ID_DECL: ColumnDecl = { name: "id", dtype: "string", nullable: true, role: "id" };

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
 * Write the collected elements into the sink as a directed graph. A vertex already in the sink is
 * updated, not counted again; a stub never overwrites one.
 * @param els - what was collected
 * @param sink - the sink
 * @param report - the load's report
 * @param signal - the load's signal
 */
export function writeElements(els: Elements, sink: GraphSink, report: ImportReportBuilder, signal: AbortSignal): void {
    if (sink.edgeCount === 0 && !sink.directedLocked && !sink.directed) {
        sink.setDirected(true);
    }
    let n = 0;
    for (const v of els.vertices.values()) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        writeVertex(v, sink, report);
    }
    for (const e of els.edges.values()) {
        if (n++ % 64 === 0) {
            throwIfAborted(signal);
        }
        writeEdge(e, sink, report);
    }
}

/**
 * Write one vertex; a stub of a vertex already in the sink writes nothing.
 * @param v - the vertex
 * @param sink - the sink
 * @param report - the load's report
 */
function writeVertex(v: Vertex, sink: GraphSink, report: ImportReportBuilder): void {
    try {
        const fresh = sink.indexOf(v.id) === INVALID_INDEX;
        if (v.stub && !fresh) {
            return;
        }
        const index = sink.addNodeRecord(v.id, v.properties);
        if (v.label !== null) {
            sink.setNodeValue(column(sink, LABELS_DECL, "node"), index, [v.label]);
        }
        if (fresh) {
            report.counts.nodes++;
        }
    } catch (err) {
        report.recordError(err, { element: String(v.id) });
        report.counts.skippedNodes++;
    }
}

/**
 * Write one edge.
 * @param e - the edge
 * @param sink - the sink
 * @param report - the load's report
 */
function writeEdge(e: Edge, sink: GraphSink, report: ImportReportBuilder): void {
    try {
        const index = sink.addEdgeRecord(e.source, e.target, e.properties, null);
        if (e.label !== null) {
            sink.setEdgeValue(column(sink, TYPE_DECL, "edge"), index, e.label);
        }
        if (e.id !== null) {
            sink.setEdgeValue(column(sink, EDGE_ID_DECL, "edge"), index, e.id);
        }
        report.counts.edges++;
    } catch (err) {
        report.recordError(err, { element: `${String(e.source)} -> ${String(e.target)}` });
        report.counts.skippedEdges++;
    }
}
