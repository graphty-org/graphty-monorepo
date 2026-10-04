/**
 * Conversion between a graph-format snapshot with its attributes and Cytoscape element definitions, for the import,
 * export, generator and dataset methods. Unlike toSnapshot() (topology and one weight, for the algorithms), these
 * carry every data field across.
 */

import { type Column, type ColumnInput, fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import type { Collection, ElementDefinition } from "cytoscape";

/**
 * Data fields Cytoscape gives a meaning of its own, and "__proto__", whose assignment would set the data object's
 * prototype (and with it inherited id, source, target or parent fields). An element's own data fields of these names
 * are not exported as columns; a column with one of these names is imported under another name (see fieldNames).
 */
const RESERVED: ReadonlySet<string> = new Set(["id", "source", "target", "parent", "__proto__"]);

/**
 * A column value as Cytoscape data: a typed array (a multi-component column) becomes a plain array.
 * @param v - the column value
 * @returns the value to store
 */
function plain(v: unknown): unknown {
    return ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v;
}

/**
 * A y coordinate between Cytoscape (y grows downward) and graph-io (y grows upward, so a Cytoscape-family file's
 * screen y is negated on import and negated back on export). Never yields -0.
 * @param y - the coordinate
 * @returns the negated coordinate
 */
export function flipY(y: number): number {
    return y === 0 ? 0 : -y;
}

/** A column that arrives under another data field name, because Cytoscape reserves its own. */
export interface RenamedColumn {
    readonly domain: "node" | "edge";
    readonly from: string;
    readonly to: string;
}

/**
 * Cytoscape element definitions for a snapshot. Node ids are the snapshot's ids as strings. Every node and edge
 * column becomes a data field of the same name, except that one named `id`, `source`, `target` or `parent` (which
 * Cytoscape reserves) becomes `<name>#<the attribute's id in the file>`, or `<name>#2` when it has none, and:
 * - a node column with the role "position" becomes the node's position (x and y; a z is dropped);
 * - a node column with the role "parent" (a compound parent, as Cytoscape JSON, GraphML nested graphs and DOT
 *   clusters carry it) becomes `data.parent`;
 * - an edge column with the role "id" becomes the edge's id when that id is not a node id and not used by an
 *   earlier edge; otherwise the edge gets no id, Cytoscape assigns one, and `onIdDropped` hears about it;
 * - the edge weights become `data.weight`: the weight column when the file had one, else the snapshot's weights
 *   when it is weighted.
 * @param snapshot - the snapshot
 * @param onRename - told about each column renamed because its name is reserved
 * @param onIdDropped - told about each edge id dropped, and whether a node or an earlier edge has it
 * @returns the nodes, then the edges
 */
export function snapshotToElements(
    snapshot: GraphSnapshot,
    onRename?: (renamed: RenamedColumn) => void,
    onIdDropped?: (id: string, takenBy: "node" | "edge") => void,
): ElementDefinition[] {
    const ids: string[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        ids.push(String(snapshot.ids.idOf(i)));
    }
    return [...nodeElements(snapshot, ids, onRename), ...edgeElements(snapshot, ids, onRename, onIdDropped)];
}

/**
 * Whether a column becomes a data field of its own (not the id or the parent, which the element gets as such).
 * @param c - the column
 * @returns true to copy it into data
 */
function kept(c: Column): boolean {
    return c.meta.role !== "id" && c.meta.role !== "parent";
}

/**
 * The data field name of each column: its own, or for a reserved name `<name>#<origin id>` (`<name>#2`, `#3`, ...
 * without one, or when that is taken), the rule graph-io follows when two attributes share a name.
 * @param cols - the columns copied into data
 * @param domain - node or edge, for onRename
 * @param onRename - told about each renamed column
 * @returns the field name by column
 */
function fieldNames(
    cols: readonly Column[],
    domain: RenamedColumn["domain"],
    onRename: ((renamed: RenamedColumn) => void) | undefined,
): Map<Column, string> {
    const taken = new Set([...RESERVED, ...cols.map((c) => c.meta.name)]);
    const out = new Map<Column, string>();
    for (const c of cols) {
        const from = c.meta.name;
        if (!RESERVED.has(from)) {
            out.set(c, from);
            continue;
        }
        const id = c.meta.origin?.id ?? null;
        const base = id === null ? from : `${from}#${id}`;
        let to = id !== null && !taken.has(base) ? base : undefined;
        for (let n = 2; to === undefined; n++) {
            to = taken.has(`${base}#${n}`) ? undefined : `${base}#${n}`;
        }
        taken.add(to);
        out.set(c, to);
        onRename?.({ domain, from, to });
    }
    return out;
}

/**
 * One row's set values as data fields.
 * @param cols - the columns to copy
 * @param row - the node or edge index
 * @param fieldOf - the data field a column's value goes to
 * @returns the data, one field per column with a value in this row
 */
function rowData(cols: readonly Column[], row: number, fieldOf: (c: Column) => string): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const c of cols) {
        if (c.isSet(row)) {
            data[fieldOf(c)] = plain(c.value(row));
        }
    }
    return data;
}

/**
 * The node elements of snapshotToElements().
 * @param snapshot - the snapshot
 * @param ids - the node ids as strings, by node index
 * @param onRename - told about each renamed column
 * @returns one element per node
 */
function nodeElements(
    snapshot: GraphSnapshot,
    ids: readonly string[],
    onRename: ((renamed: RenamedColumn) => void) | undefined,
): ElementDefinition[] {
    const nodeCols = [...snapshot.nodes].filter(kept);
    const position = nodeCols.find((c) => c.meta.role === "position" && c.meta.components >= 2);
    const nodeData = nodeCols.filter((c) => c !== position);
    const names = fieldNames(nodeData, "node", onRename);
    const parent = snapshot.nodes.byRole("parent");
    const out: ElementDefinition[] = [];
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const data = rowData(nodeData, i, (c) => names.get(c) ?? c.meta.name);
        data.id = ids[i];
        const p = parent?.isSet(i) === true ? parent.value(i) : undefined;
        if (typeof p === "number" && p !== i && p < ids.length) {
            data.parent = ids[p];
        }
        const el: ElementDefinition = { group: "nodes", data: data as ElementDefinition["data"] };
        const xy = position?.isSet(i) === true ? (position.value(i) as ArrayLike<number>) : undefined;
        if (xy !== undefined && Number.isFinite(xy[0]) && Number.isFinite(xy[1])) {
            el.position = { x: xy[0], y: xy[1] };
        }
        out.push(el);
    }
    return out;
}

/**
 * The edge elements of snapshotToElements().
 * @param snapshot - the snapshot
 * @param ids - the node ids as strings, by node index
 * @param onRename - told about each renamed column
 * @param onIdDropped - told about each dropped edge id
 * @returns one element per edge
 */
function edgeElements(
    snapshot: GraphSnapshot,
    ids: readonly string[],
    onRename: ((renamed: RenamedColumn) => void) | undefined,
    onIdDropped: ((id: string, takenBy: "node" | "edge") => void) | undefined,
): ElementDefinition[] {
    const edgeCols = [...snapshot.edges].filter(kept);
    const named = edgeCols.some((c) => c.meta.name === "weight");
    const weightColumn = edgeCols.find((c) => c.meta.role === "weight");
    const names = fieldNames(edgeCols, "edge", onRename);
    const fieldOf = (c: Column): string => (c === weightColumn && !named ? "weight" : (names.get(c) ?? c.meta.name));
    const edgeIds = snapshot.edges.byRole("id");
    const nodeIds = new Set(ids);
    const usedEdgeIds = new Set<string>();
    const out: ElementDefinition[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const data = rowData(edgeCols, e, fieldOf);
        if (weightColumn === undefined && !named && snapshot.weights !== null) {
            data.weight = snapshot.weights[snapshot.edgeToArc[e]];
        }
        const id = edgeIds?.isSet(e) === true ? String(edgeIds.value(e)) : undefined;
        if (id !== undefined) {
            if (nodeIds.has(id) || usedEdgeIds.has(id)) {
                onIdDropped?.(id, nodeIds.has(id) ? "node" : "edge");
            } else {
                usedEdgeIds.add(id);
                data.id = id;
            }
        }
        data.source = ids[snapshot.edgeSource(e)];
        data.target = ids[snapshot.edgeTarget(e)];
        out.push({ group: "edges", data: data as ElementDefinition["data"] });
    }
    return out;
}

/**
 * A column of data values: f64 when every set value is a number (NaN and the infinities included), bool when every one is a boolean, string
 * when every one is a string, json otherwise. A missing value (undefined or null) is an unset row.
 * @param values - one value per row
 * @param label - whether this is the `label` field: a string one gets the role "label", so a format with a label
 * of its own (GEXF, Pajek, DOT, ...) writes it there and reads it back under the same name
 * @returns the column, or undefined when no row has a value
 */
function column(values: unknown[], label: boolean): ColumnInput | undefined {
    const set = values.filter((v) => v !== undefined && v !== null);
    if (set.length === 0) {
        return undefined;
    }
    const rows = values.map((v) => (v === undefined ? null : v));
    const all = (test: (v: unknown) => boolean): boolean => set.every(test);
    if (all((v) => typeof v === "number")) {
        return { data: rows, decl: { dtype: "f64" } };
    }
    if (all((v) => typeof v === "boolean")) {
        return { data: rows, decl: { dtype: "bool" } };
    }
    if (all((v) => typeof v === "string")) {
        return { data: rows, decl: { dtype: "string", ...(label ? { role: "label" } : {}) } };
    }
    // in a json column null is a set value (JSON null), which a format would write as the text "null"
    return { data: values.map((v) => v ?? undefined), decl: { dtype: "json" } };
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
        const c = column(
            records.map((r) => r[name]),
            name === "label",
        );
        if (c !== undefined) {
            out[name] = c;
        }
    }
    return out;
}

/**
 * A snapshot of a collection with every data field as a column and every node's position as a "position" column
 * (y negated: graph-io's y grows upward), for an exporter. Edges whose endpoints are not both in the collection are left out. A numeric edge field named
 * `weight` becomes the snapshot's edge weights when every edge has one. Edge ids become an "id" column, and a
 * compound node's parent a "parent" column when the parent is in the collection too (a parent outside it is left
 * out, so the node is written as a top-level node). Hidden elements are written like any other: pass
 * `cy.elements(":visible")` to leave them out.
 * @param eles - the collection
 * @param options - the direction and the id type
 * @param options.directed - write a directed graph (default false)
 * @param options.screenY - keep Cytoscape's y as it is instead of negating it (default false)
 * @param options.integerIds - when every node id is a non-negative integer written plainly ("0", "17"), give the
 * snapshot number ids, so a format that holds only integer ids (GML, CX2) writes them as they are (default false)
 * @returns the snapshot
 */
export function elementsToSnapshot(
    eles: Collection,
    options: {
        readonly directed?: boolean | undefined;
        readonly integerIds?: boolean | undefined;
        readonly screenY?: boolean | undefined;
    } = {},
): GraphSnapshot {
    const nodes = eles.nodes();
    const index = new Map<string, number>();
    const names = nodes.map((n, i) => {
        index.set(n.id(), i);
        return n.id();
    });
    const integers = options.integerIds === true && names.every((id) => /^(?:0|[1-9]\d{0,14})$/.test(id));
    const ids: (string | number)[] = integers ? names.map(Number) : names;
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
        xy[2 * i + 1] = options.screenY === true ? p.y : flipY(p.y);
    });
    const parents = nodes.map((n) => index.get(n.parent().first().id()) ?? null);
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
            ...(parents.some((p) => p !== null)
                ? { parent: { data: parents, decl: { dtype: "u32", role: "parent", refersTo: "node" } } }
                : {}),
        },
        edgeColumns: {
            ...edgeColumns,
            id: { data: edges.map((e) => e.id()), decl: { dtype: "string", role: "id", unique: true } },
        },
    });
}
