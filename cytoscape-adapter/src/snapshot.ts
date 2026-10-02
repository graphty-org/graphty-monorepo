/**
 * Conversion between Cytoscape elements and the graph-format snapshot every graphty layout and algorithm takes.
 *
 * A snapshot addresses nodes and edges by dense index. Here node index i is `nodes[i]` and edge index e is
 * `edges[e]`, in the collection order Cytoscape gave, so a result array maps back to elements by position.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import type { Collection, Core, EdgeCollection, NodeCollection } from "cytoscape";

/** How to read a Cytoscape collection as a graph. */
export interface SnapshotOptions {
    /** Build a directed snapshot. Default false. */
    readonly directed?: boolean | undefined;
    /** Edge data field holding the weight; a missing or non-numeric value counts as 1. Default: unweighted. */
    readonly weight?: string | undefined;
}

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
function coreOf(eles: Collection | NodeCollection | EdgeCollection): Core {
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
 * @param weight - edge data field of the weight, or undefined for none
 * @returns the snapshot and element arrays
 */
function build(eles: Collection, directed: boolean, weight: string | undefined): CytoscapeSnapshot {
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
            const w: unknown = e.data(weight);
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
