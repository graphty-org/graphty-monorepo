/**
 * One entry point for the JSON documents a program writes whole (Cytoscape.js, graphology, vis.js): the dialect is
 * detected here, and every one comes back as the same flat node and edge records, so a caller needs no branch on the
 * program that wrote the file.
 */

import { type Column, GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import { extractPositions } from "../../positions/extract.js";
import type { ImportReport } from "../../types.js";
import { hasKey, isJsonObject, jsonShapeOf, sniffJsonDialect, SUFFIX } from "./dialect.js";
import { jsonImporter, type JsonImportOptions } from "./importer.js";

/**
 * Options of `readJsonRecords()`: every JSON importer option (`sigmaSettings`, `errorLimit`, ...), and the builder to
 * read into.
 * @category Loading
 */
export interface JsonRecordsOptions extends Omit<JsonImportOptions, "dialect"> {
    /** The builder the document is read into and frozen; a plain undirected one with f64 weights when absent. */
    readonly builder?: GraphBuilder;
}

/**
 * A JSON document read as flat records: one node record per node the document declared, in its order, and one edge
 * record per edge the importer kept. Every record holds the document's own top-level keys; a node record also holds
 * `id` and, when the document placed it, `position: { x, y, z }` (its center, y up, in the file's units), and an
 * edge record also holds `source` and `target`.
 * @category Loading
 */
export interface JsonRecords {
    /** The graph the importer read. */
    readonly snapshot: GraphSnapshot;
    /** The importer's report. */
    readonly report: ImportReport;
    /** The node records. */
    readonly nodes: Record<string, unknown>[];
    /** The edge records. */
    readonly edges: Record<string, unknown>[];
    /**
     * Where a column's value sits on the records, unchanged: the keys down to it (a graphology attribute is
     * `["attributes", name]`), or null when the records do not hold it as the column does.
     * @param kind - node or edge
     * @param column - the column's name in the snapshot
     * @returns the keys, or null
     */
    path(kind: "node" | "edge", column: string): readonly string[] | null;
}

/** The record keys that identify a node or an edge, which no column takes. */
const IDENTITY_KEYS = { node: ["id"], edge: ["source", "target", "id"] } as const;

/** The prefix graph-format reserves for the columns that carry structure rather than data. */
const RESERVED_PREFIX = "graphty.";

/**
 * A document's top-level object.
 * @param document - the parsed document
 * @returns it, or an empty object for any other value
 */
function rootOf(document: unknown): Record<string, unknown> {
    return isJsonObject(document) ? document : {};
}

/**
 * Read a Cytoscape.js, graphology or vis.js document as flat records. Other JSON documents (node-link, JGF, ...)
 * answer null: their records are their columns, read with `jsonImporter` directly.
 * @param text - the document's text
 * @param options - importer options, passed on to `jsonImporter`; ids are kept as the file wrote them and no weight
 *     is read unless the options say otherwise
 * @returns the records, or null for a document of another dialect
 * @throws ImportError when the importer gives up on the document
 * @example
 * ```ts
 * const read = await readJsonRecords('{"elements":{"nodes":[{"data":{"id":"a"}}],"edges":[]}}');
 * read?.nodes; // [{ id: "a" }]
 * ```
 * @category Loading
 */
export async function readJsonRecords(text: string, options: JsonRecordsOptions = {}): Promise<JsonRecords | null> {
    const document: unknown = JSON.parse(text);
    const dialect = sniffJsonDialect(document);
    if (dialect !== "cytoscape" && dialect !== "graphology" && dialect !== "vis") {
        return null;
    }

    const { builder = new GraphBuilder({ directed: false, weightDtype: "f64" }), ...importOptions } = options;
    const declared: NodeId[] = [];
    const sink = new Proxy(builder, {
        get(target, key): unknown {
            const value: unknown = Reflect.get(target, key, target);
            if (key === "addNode") {
                return (id: NodeId): number => {
                    declared.push(id);
                    return target.addNode(id);
                };
            }
            if (key === "addNodes") {
                return (ids: Iterable<NodeId>, ...rest: unknown[]): unknown => {
                    const list = [...ids];
                    declared.push(...list);
                    return (target.addNodes as (...a: unknown[]) => unknown)(list, ...rest);
                };
            }
            return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
        },
    });
    const report = await jsonImporter.import(text, sink, { ids: "keep", weightFrom: null, ...importOptions, dialect });
    const snapshot = builder.freeze();
    const read =
        dialect === "cytoscape"
            ? cytoscapeRecords(snapshot, [...new Set(declared)])
            : fileRecords(snapshot, rootOf(document), dialect);
    placeNodes(read.nodes, snapshot, report);
    return { snapshot, report, ...read };
}

/** The records and their column paths, before positions are written. */
type Records = Pick<JsonRecords, "nodes" | "edges" | "path">;

/**
 * A Cytoscape.js document's records: each element's `data` keys and `classes` from the columns, `parent` as the
 * parent node's id.
 * @param snapshot - the imported graph
 * @param declared - the ids of the nodes the document declared, in order
 * @returns the records
 */
function cytoscapeRecords(snapshot: GraphSnapshot, declared: readonly NodeId[]): Records {
    const { ids } = snapshot;
    const parent = snapshot.nodes.byRole("parent");
    const nodes = declared.map((id) => {
        const row = ids.indexOf(id);
        const record: Record<string, unknown> = { id };
        copyColumns(snapshot.nodes, row, record);
        if (parent?.isSet(row) === true) {
            record[parent.meta.name] = ids.idOf(parent.value(row) as number);
        }
        return record;
    });
    const weight = snapshot.edges.byRole("weight");
    const edges = logicalEdges(snapshot).map((row) => {
        const record: Record<string, unknown> = {
            source: ids.idOf(snapshot.edgeSource(row)),
            target: ids.idOf(snapshot.edgeTarget(row)),
        };
        if (weight?.isSet(row) === true) {
            record.weight = weight.value(row);
        }
        copyColumns(snapshot.edges, row, record);
        return record;
    });
    const path = (kind: "node" | "edge", name: string): readonly string[] | null => {
        const column = (kind === "node" ? snapshot.nodes : snapshot.edges).get(name);
        if (column === null || column === parent) {
            return null;
        }
        const key = copiedKey(kind, column);
        return key === null ? null : [key];
    };
    return { nodes, edges, path };
}

/**
 * A graphology or vis.js document's records: each record as the file wrote it, a graphology node gaining `id` (its
 * `key`), a vis.js edge gaining `source` and `target` (its `from` and `to`); only the edges the importer kept.
 * @param snapshot - the imported graph
 * @param root - the parsed document
 * @param dialect - graphology or vis
 * @returns the records
 */
function fileRecords(snapshot: GraphSnapshot, root: Record<string, unknown>, dialect: "graphology" | "vis"): Records {
    const rawNodes = Array.isArray(root.nodes) ? root.nodes.filter(isJsonObject) : [];
    const nodes = rawNodes.map((node) =>
        hasKey(node, "id") || !hasKey(node, "key") ? node : { id: node.key, ...node },
    );
    const shape = jsonShapeOf(snapshot);
    const sourceKey = shape?.sourceKey ?? (dialect === "vis" ? "from" : "source");
    const targetKey = shape?.targetKey ?? (dialect === "vis" ? "to" : "target");
    const rawEdges: unknown[] = Array.isArray(root.edges) ? root.edges : [];
    const edgeRecords = new Map<number, Record<string, unknown>>();
    let next = 0;
    for (const row of logicalEdges(snapshot)) {
        const source = String(snapshot.ids.idOf(snapshot.edgeSource(row)));
        const target = String(snapshot.ids.idOf(snapshot.edgeTarget(row)));
        // each kept edge is the next record naming the same endpoints, which skips the records the importer refused
        while (next < rawEdges.length) {
            const edge = rawEdges[next++];
            if (isJsonObject(edge) && String(edge[sourceKey]) === source && String(edge[targetKey]) === target) {
                edgeRecords.set(row, edge);
                break;
            }
        }
    }
    const edges = [...edgeRecords.values()].map((edge) =>
        hasKey(edge, "source") && hasKey(edge, "target")
            ? edge
            : { source: edge[sourceKey], target: edge[targetKey], ...edge },
    );

    const byId = new Map<unknown, Record<string, unknown>>();
    for (const node of nodes) {
        if (!byId.has(node.id)) {
            byId.set(node.id, node);
        }
    }
    const paths = new Map<Column, readonly string[] | null>();
    const find = (kind: "node" | "edge", column: Column): readonly string[] | null => {
        if (column.meta.role !== null || copiedKey(kind, column) === null) {
            return null;
        }
        const rows = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (let row = 0; row < rows; row++) {
            const record = kind === "node" ? byId.get(snapshot.ids.idOf(row)) : edgeRecords.get(row);
            if (record !== undefined && column.isSet(row)) {
                return rawPath(record, column.meta.name);
            }
        }
        return null;
    };
    const path = (kind: "node" | "edge", name: string): readonly string[] | null => {
        const column = (kind === "node" ? snapshot.nodes : snapshot.edges).get(name);
        if (column === null) {
            return null;
        }
        if (!paths.has(column)) {
            paths.set(column, find(kind, column));
        }
        return paths.get(column) ?? null;
    };
    return { nodes, edges, path };
}

/**
 * Where a graphology or vis.js record holds the value the importer read into a column: a graphology attribute under
 * `attributes`, any other key at the top of the record. The importer names a column after its key, with `#data` for
 * an attribute and `#element` for a top-level key that took a name already used.
 * @param record - one record that holds a value of the column
 * @param name - the column's name
 * @returns the keys down to the value, or null when the record holds it under neither
 */
function rawPath(record: Record<string, unknown>, name: string): string[] | null {
    if (name.endsWith(SUFFIX.element)) {
        return [name.slice(0, -SUFFIX.element.length)];
    }
    const attributes = isJsonObject(record.attributes) ? record.attributes : null;
    const key = name.endsWith(SUFFIX.data) ? name.slice(0, -SUFFIX.data.length) : name;
    if (attributes !== null && hasKey(attributes, key)) {
        return ["attributes", key];
    }
    return key === name && hasKey(record, name) ? [name] : null;
}

/**
 * The record key a column's value is copied under: its own name, except a reserved `graphty.*` column, the stored
 * position (written as `position`) and one named like a key that identifies the record.
 * @param kind - node or edge
 * @param column - the column
 * @returns the key, or null when the column is not copied
 */
function copiedKey(kind: "node" | "edge", column: Column): string | null {
    const { name } = column.meta;
    return name.startsWith(RESERVED_PREFIX) ||
        column.meta.role === "position" ||
        (IDENTITY_KEYS[kind] as readonly string[]).includes(name)
        ? null
        : name;
}

/**
 * Copy every set cell of a row onto a record under its column's name, a multi-component cell as an array, leaving
 * out what {@link copiedKey} leaves out and any key the record already holds.
 * @param table - the node or edge table
 * @param row - the row
 * @param record - receives the values
 */
function copyColumns(table: Iterable<Column>, row: number, record: Record<string, unknown>): void {
    for (const column of table) {
        const { name } = column.meta;
        if (name.startsWith(RESERVED_PREFIX) || column.meta.role === "position" || hasKey(record, name)) {
            continue;
        }
        if (column.isSet(row)) {
            const value: unknown = column.value(row);
            record[name] = ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value;
        }
    }
}

/**
 * The rows of the document's own edges: every edge row but the mirror half of a pair the importer expanded.
 * @param snapshot - the imported graph
 * @returns the rows, in order
 */
function logicalEdges(snapshot: GraphSnapshot): number[] {
    const pair = snapshot.edges.byRole("pair");
    const rows: number[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (!(pair?.isSet(row) === true && (pair.value(row) as number) < row)) {
            rows.push(row);
        }
    }
    return rows;
}

/**
 * Write each placed node's stored position onto its record as `position`, read by `extractPositions()`; a record
 * the document did not place keeps what it holds, and a file whose positions are unusable writes none.
 * @param nodes - the node records
 * @param snapshot - the imported graph
 * @param report - the importer's report
 */
function placeNodes(nodes: readonly Record<string, unknown>[], snapshot: GraphSnapshot, report: ImportReport): void {
    const positions = extractPositions(jsonImporter, snapshot, report);
    if (positions?.usable !== true) {
        return;
    }
    const { coords } = positions;
    for (const record of nodes) {
        const { id } = record;
        const row = typeof id === "string" || typeof id === "number" ? snapshot.ids.indexOf(id) : -1;
        const x = row < 0 ? Number.NaN : coords[3 * row];
        if (!Number.isNaN(x)) {
            record.position = { x, y: coords[3 * row + 1], z: coords[3 * row + 2] };
        }
    }
}
