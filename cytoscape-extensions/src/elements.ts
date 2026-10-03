/**
 * Conversion between a graph-format snapshot with its attributes and Cytoscape element definitions, for the import,
 * export, generator and dataset methods. Unlike toSnapshot() (topology and one weight, for the algorithms), these
 * carry every data field across.
 */

import { type ColumnInput, fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import type { Collection, ElementDefinition } from "cytoscape";

/** Data fields Cytoscape gives a meaning of its own; a column with one of these names is not copied into data. */
const RESERVED: ReadonlySet<string> = new Set(["id", "source", "target", "parent"]);

/**
 * A column value as Cytoscape data: a typed array (a multi-component column) becomes a plain array.
 * @param v - the column value
 * @returns the value to store
 */
function plain(v: unknown): unknown {
    return ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v;
}

/**
 * Cytoscape element definitions for a snapshot. Node ids are the snapshot's ids as strings. Every node and edge
 * column becomes a data field of the same name (except the reserved `id`, `source`, `target` and `parent`), a
 * node column with the role "position" becomes the node's position, and edge weights become `data.weight` when
 * no column already holds them. Edges get no id: Cytoscape assigns one, so an edge id can never collide with a
 * node id.
 * @param snapshot - the snapshot
 * @returns the nodes, then the edges
 */
export function snapshotToElements(snapshot: GraphSnapshot): ElementDefinition[] {
    const nodeCols = [...snapshot.nodes].filter((c) => !RESERVED.has(c.meta.name) && c.meta.role !== "id");
    const position = nodeCols.find((c) => c.meta.role === "position" && c.meta.components >= 2);
    const nodeData = nodeCols.filter((c) => c !== position);
    const edgeCols = [...snapshot.edges].filter((c) => !RESERVED.has(c.meta.name) && c.meta.role !== "id");
    const weights = edgeCols.some((c) => c.meta.name === "weight" || c.meta.role === "weight")
        ? null
        : snapshot.weights;
    const ids: string[] = [];
    const out: ElementDefinition[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        ids.push(id);
        const data: Record<string, unknown> = {};
        for (const c of nodeData) {
            if (c.isSet(i)) {
                data[c.meta.name] = plain(c.value(i));
            }
        }
        data.id = id;
        const el: ElementDefinition = { group: "nodes", data: data as ElementDefinition["data"] };
        const p = position?.isSet(i) === true ? (position.value(i) as ArrayLike<number>) : undefined;
        if (p !== undefined && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
            el.position = { x: p[0], y: p[1] };
        }
        out.push(el);
    }
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const data: Record<string, unknown> = {};
        for (const c of edgeCols) {
            if (c.isSet(e)) {
                data[c.meta.name] = plain(c.value(e));
            }
        }
        if (weights !== null) {
            data.weight = weights[snapshot.edgeToArc[e]];
        }
        data.source = ids[snapshot.edgeSource(e)];
        data.target = ids[snapshot.edgeTarget(e)];
        out.push({ group: "edges", data: data as ElementDefinition["data"] });
    }
    return out;
}

/**
 * A column of data values: f64 when every set value is a finite number, bool when every one is a boolean, string
 * when every one is a string, json otherwise. A missing value (undefined or null) is an unset row.
 * @param values - one value per row
 * @returns the column, or undefined when no row has a value
 */
function column(values: unknown[]): ColumnInput | undefined {
    const set = values.filter((v) => v !== undefined && v !== null);
    if (set.length === 0) {
        return undefined;
    }
    const rows = values.map((v) => (v === undefined ? null : v));
    const all = (test: (v: unknown) => boolean): boolean => set.every(test);
    if (all((v) => typeof v === "number" && Number.isFinite(v))) {
        return { data: rows, decl: { dtype: "f64" } };
    }
    if (all((v) => typeof v === "boolean")) {
        return { data: rows, decl: { dtype: "bool" } };
    }
    if (all((v) => typeof v === "string")) {
        return { data: rows, decl: { dtype: "string" } };
    }
    return { data: rows, decl: { dtype: "json" } };
}

/**
 * The columns of a set of elements' data, one per field, skipping the reserved ones.
 * @param records - each element's data
 * @returns the columns by name
 */
function columns(records: readonly Record<string, unknown>[]): Record<string, ColumnInput> {
    const names = new Set<string>();
    for (const r of records) {
        for (const k of Object.keys(r)) {
            if (!RESERVED.has(k)) {
                names.add(k);
            }
        }
    }
    const out: Record<string, ColumnInput> = {};
    for (const name of names) {
        const c = column(records.map((r) => r[name]));
        if (c !== undefined) {
            out[name] = c;
        }
    }
    return out;
}

/**
 * A snapshot of a collection with every data field as a column and every node's position as a "position" column,
 * for an exporter. Edges whose endpoints are not both in the collection are left out. A numeric edge field named
 * `weight` becomes the snapshot's edge weights when every edge has one.
 * @param eles - the collection
 * @param options - the direction
 * @param options.directed - write a directed graph (default false)
 * @returns the snapshot
 */
export function elementsToSnapshot(
    eles: Collection,
    options: { readonly directed?: boolean | undefined } = {},
): GraphSnapshot {
    const nodes = eles.nodes();
    const index = new Map<string, number>();
    const ids = nodes.map((n, i) => {
        index.set(n.id(), i);
        return n.id();
    });
    const edges = eles.edges().filter((e) => index.has(e.source().id()) && index.has(e.target().id()));
    const src = new Uint32Array(edges.length);
    const dst = new Uint32Array(edges.length);
    edges.forEach((e, k) => {
        src[k] = index.get(e.source().id()) ?? 0;
        dst[k] = index.get(e.target().id()) ?? 0;
    });
    const xy = new Float64Array(nodes.length * 2);
    nodes.forEach((n, i) => {
        const p = n.position();
        xy[2 * i] = p.x;
        xy[2 * i + 1] = p.y;
    });
    const edgeColumns = columns(edges.map((e) => e.data() as Record<string, unknown>));
    let weights: Float64Array<ArrayBuffer> | undefined;
    const w = edgeColumns.weight;
    if (w?.decl.dtype === "f64" && (w.data as unknown[]).every((v) => v !== null)) {
        weights = Float64Array.from(w.data as number[]);
        delete edgeColumns.weight;
    }
    return fromEdgeArrays({
        directed: options.directed ?? false,
        ids,
        src,
        dst,
        weights,
        nodeColumns: {
            ...columns(nodes.map((n) => n.data() as Record<string, unknown>)),
            position: { data: xy, decl: { dtype: "f64", components: 2, role: "position" } },
        },
        edgeColumns,
    });
}
