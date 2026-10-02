/**
 * Conversion between Cytoscape elements and the graph-format snapshot every graphty layout and algorithm takes.
 *
 * A snapshot addresses nodes and edges by dense index. Here node index i is `nodes[i]` and edge index e is
 * `edges[e]`, in the collection order Cytoscape gave, so a result array maps back to elements by position.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import type { Collection, Core, EdgeCollection, EdgeSingular, NodeCollection } from "cytoscape";

/** How to read a Cytoscape collection as a graph. */
export interface SnapshotOptions {
    /** Build a directed snapshot. Default false. */
    readonly directed?: boolean | undefined;
    /**
     * The edge weight: an edge data field (a missing or non-numeric value counts as 1), or a function of the edge
     * as Cytoscape's built-in algorithms take it. Default: unweighted. A function result is not cached.
     */
    readonly weight?: string | ((edge: EdgeSingular) => number) | undefined;
}

/** A node set given the Cytoscape way: a selector over the collection's nodes, or a collection. */
export type NodeSelection = string | Collection | NodeCollection;

/** A snapshot of a Cytoscape collection plus the element arrays its indices refer to. */
export interface CytoscapeSnapshot {
    readonly snapshot: GraphSnapshot;
    /** Node index i is `nodes[i]`. */
    readonly nodes: NodeCollection;
    /** Edge index e is `edges[e]`: the collection's edges whose two endpoints are both in `nodes`. */
    readonly edges: EdgeCollection;
}

interface CacheEntry {
    readonly key: string;
    readonly eles: Collection;
    readonly version: number;
    readonly value: CytoscapeSnapshot;
}

interface CoreState {
    version: number;
    entries: CacheEntry[];
}

const state = new WeakMap<Core, CoreState>();

/**
 * The core of a collection. Every collection has `cy()` at run time; Cytoscape's typings declare it only on single
 * elements.
 * @param eles - the collection
 * @returns its core
 */
export function coreOf(eles: Collection | NodeCollection | EdgeCollection): Core {
    return (eles as unknown as { cy(): Core }).cy();
}

/**
 * The per-core cache state; the first call subscribes to the events that change the graph.
 * @param cy - the core
 * @returns its cache state
 */
function coreState(cy: Core): CoreState {
    let s = state.get(cy);
    if (s === undefined) {
        const created: CoreState = { version: 0, entries: [] };
        // ponytail: "data" fires for any field, so writing a result into data also invalidates; a per-field
        // check would need Cytoscape to say which field changed, and it does not.
        cy.on("add remove data move", () => {
            created.version++;
            created.entries = [];
        });
        state.set(cy, created);
        s = created;
    }
    return s;
}

/**
 * Builds (or returns the cached) snapshot of a collection. The cache holds one snapshot per option set per core and
 * is dropped when an element is added, removed, moved to other endpoints, or has its data changed.
 * @param eles - the collection to read: its nodes, and its edges whose endpoints are both in it
 * @param options - directed flag and weight field
 * @returns the snapshot and the element arrays its indices refer to
 */
export function toSnapshot(eles: Collection, options: SnapshotOptions = {}): CytoscapeSnapshot {
    const directed = options.directed ?? false;
    if (typeof options.weight === "function") {
        return build(eles, directed, options.weight);
    }
    const key = `${String(directed)}|${options.weight ?? ""}`;
    const cs = coreState(coreOf(eles));
    const hit = cs.entries.find((e) => e.key === key && e.version === cs.version && e.eles.same(eles));
    if (hit !== undefined) {
        return hit.value;
    }
    const value = build(eles, directed, options.weight);
    cs.entries = [...cs.entries.filter((e) => e.key !== key), { key, eles, version: cs.version, value }];
    return value;
}

/**
 * Builds a snapshot without the cache.
 * @param eles - the collection
 * @param directed - whether the snapshot is directed
 * @param weight - edge data field or function of the weight, or undefined for none
 * @returns the snapshot and element arrays
 */
function build(eles: Collection, directed: boolean, weight: SnapshotOptions["weight"]): CytoscapeSnapshot {
    const nodes = eles.nodes();
    const ids: string[] = [];
    const index = new Map<string, number>();
    nodes.forEach((n, i) => {
        ids.push(n.id());
        index.set(n.id(), i);
    });
    const edges = eles.edges().filter((e) => index.has(e.source().id()) && index.has(e.target().id()));
    const src = new Uint32Array(edges.length);
    const dst = new Uint32Array(edges.length);
    const weights = weight === undefined ? undefined : new Float64Array(edges.length);
    edges.forEach((e, k) => {
        src[k] = index.get(e.source().id()) ?? 0;
        dst[k] = index.get(e.target().id()) ?? 0;
        if (weights !== undefined && weight !== undefined) {
            const w: unknown = typeof weight === "function" ? weight(e) : e.data(weight);
            weights[k] = typeof w === "number" && Number.isFinite(w) ? w : 1;
        }
    });
    const snapshot = fromEdgeArrays({ directed, ids, src, dst, weights });
    return { snapshot, nodes, edges };
}

/**
 * Writes one value per element into its data, in one batch (one style pass).
 * @param elements - `nodes` or `edges` of a CytoscapeSnapshot, in index order
 * @param values - one value per element
 * @param field - the data field to write
 */
export function writeData(elements: NodeCollection | EdgeCollection, values: ArrayLike<number>, field: string): void {
    coreOf(elements).batch(() => {
        elements.forEach((ele, i) => {
            ele.data(field, values[i]);
        });
    });
}

/**
 * Indices of the snapshot's nodes in a selection.
 * @param cs - the snapshot
 * @param sel - a selector or a collection
 * @returns the node indices, in collection order
 */
export function indicesOf(cs: CytoscapeSnapshot, sel: NodeSelection): number[] {
    const picked = typeof sel === "string" ? cs.nodes.filter(sel) : cs.nodes.intersection(sel as Collection);
    return picked.map((n) => cs.snapshot.ids.requireIndex(n.id()));
}

/**
 * The index of the first node of a selection.
 * @param cs - the snapshot
 * @param sel - a selector or a collection, or undefined
 * @param what - the option name, for the error
 * @returns the index, or undefined when no selection was given
 * @throws Error when the selection matches no node of the snapshot
 */
export function indexOf(cs: CytoscapeSnapshot, sel: NodeSelection | undefined, what: string): number | undefined {
    if (sel === undefined) {
        return undefined;
    }
    const [i] = indicesOf(cs, sel);
    if (i === undefined) {
        throw new Error(`${what} matches no node of the collection`);
    }
    return i;
}
