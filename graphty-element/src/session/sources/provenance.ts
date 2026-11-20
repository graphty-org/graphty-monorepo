/**
 * @file Which load supplied each node and edge: the `provenance` graph value, kept beside
 * `sources` so undo, redo and a project file move it with the graph, and the lookups the session
 * reads it through. An element two loads both supplied is listed under both.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId, SourceKey } from "../../catalog/types";
import { edgeCounterOf } from "../../data/edgeIdentity";

/** The graph value holding what each load supplied. */
export const PROVENANCE_VALUE = "provenance";

/** What one load supplied: the node ids and edge ids its rows named, held or not. */
export interface Supplied {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
    /**
     * The nodes its rows named that the graph already held when it ran and that no load supplied
     * (a node `addNodes` made), which taking it out leaves. Absent when there were none, and on a
     * load recorded before it was kept, which takes every node it named.
     */
    readonly held?: readonly NodeId[];
}

/** The `provenance` graph value: what each load supplied, by its key. */
export type Provenance = Readonly<Record<SourceKey, Supplied>>;

/** Every element's loads, by id. */
interface ProvenanceIndex {
    readonly nodes: ReadonlyMap<NodeId, readonly SourceKey[]>;
    readonly edges: ReadonlyMap<EdgeId, readonly SourceKey[]>;
}

const EMPTY: ProvenanceIndex = { nodes: new Map(), edges: new Map() };
const indexes = new WeakMap<Provenance, ProvenanceIndex>();

/**
 * One kind's loads by id. An id one load supplied shares that load's one list, so a load of a
 * million edges makes no list per edge; an id several loads supplied gets its own.
 * @param provenance - the value
 * @param kind - nodes or edges
 * @returns the loads by id, oldest first
 */
function byId<T extends NodeId>(provenance: Provenance, kind: "nodes" | "edges"): Map<T, readonly SourceKey[]> {
    const map = new Map<T, readonly SourceKey[]>();
    for (const [key, supplied] of Object.entries(provenance)) {
        const only = Object.freeze([key]);
        for (const id of supplied[kind] as readonly T[]) {
            const had = map.get(id);
            map.set(id, had === undefined ? only : Object.freeze([...had, key]));
        }
    }

    return map;
}

/**
 * Every element's loads, by id, each kind built once per provenance value on its first read: a
 * reader of node loads never pays for the edges.
 * @param provenance - the value, or undefined when no load recorded one
 * @returns the index
 */
export function provenanceIndex(provenance: Provenance | undefined): ProvenanceIndex {
    if (provenance === undefined) {
        return EMPTY;
    }

    let index = indexes.get(provenance);
    if (index === undefined) {
        let nodes: Map<NodeId, readonly SourceKey[]> | undefined;
        let edges: Map<EdgeId, readonly SourceKey[]> | undefined;
        index = {
            get nodes() {
                nodes ??= byId<NodeId>(provenance, "nodes");
                return nodes;
            },
            get edges() {
                edges ??= byId<EdgeId>(provenance, "edges");
                return edges;
            },
        };
        indexes.set(provenance, index);
    }

    return index;
}

/** Each load's edge ids as counters, parsed once per frozen list. */
const countersOf = new WeakMap<readonly EdgeId[], Float64Array>();

/** The edge counters one snapshot holds, sorted, read once from its id column. */
const heldEdges = new WeakMap<GraphSnapshot, Float64Array>();

/**
 * How many of the ids one load supplied the graph still holds: a typed pass with a binary search
 * per id, no hash lookup and no list built, so a recount after every edit of a million-edge graph
 * stays cheap.
 * @param supplied - what the load supplied
 * @param snapshot - the graph now
 * @returns the node and edge counts
 */
export function heldCounts(supplied: Supplied, snapshot: GraphSnapshot): { nodes: number; edges: number } {
    let nodes = 0;
    for (const id of supplied.nodes) {
        if (snapshot.ids.has(id)) {
            nodes++;
        }
    }

    let counters = countersOf.get(supplied.edges);
    if (counters === undefined) {
        counters = Float64Array.from(supplied.edges, (id) => edgeCounterOf(id));
        countersOf.set(supplied.edges, counters);
    }

    const held = edgesHeld(snapshot);
    let edges = 0;
    for (const counter of counters) {
        if (counter >= 0 && holds(held, counter)) {
            edges++;
        }
    }

    return { nodes, edges };
}

/**
 * Whether a sorted list holds a value.
 * @param sorted - the list, ascending
 * @param value - the value
 * @returns true when it is there
 */
function holds(sorted: Float64Array, value: number): boolean {
    let low = 0;
    let high = sorted.length - 1;
    while (low <= high) {
        const middle = (low + high) >>> 1;
        const at = sorted[middle];
        if (at === value) {
            return true;
        }

        if (at < value) {
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }

    return false;
}

/**
 * The edge counters a snapshot holds, sorted: sized by the snapshot's edges, never by how high a
 * counter runs (a saved file may name any edge id, so counters are not dense).
 * @param snapshot - the snapshot
 * @returns the counters, ascending
 */
function edgesHeld(snapshot: GraphSnapshot): Float64Array {
    let held = heldEdges.get(snapshot);
    if (held === undefined) {
        const column = snapshot.edges.byRole("id");
        held = new Float64Array(snapshot.edgeCount);
        let count = 0;
        for (let edge = 0; edge < snapshot.edgeCount; edge++) {
            const counter = column?.isSet(edge) === true ? column.value(edge) : undefined;
            if (typeof counter === "number" && counter >= 0) {
                held[count++] = counter;
            }
        }

        held = held.subarray(0, count).sort();
        heldEdges.set(snapshot, held);
    }

    return held;
}

/**
 * The ids any of the loads supplied.
 * @param provenance - the value
 * @param keys - the loads
 * @returns the node ids and the edge ids
 */
export function suppliedBy(
    provenance: Provenance | undefined,
    keys: readonly SourceKey[],
): { readonly nodes: ReadonlySet<NodeId>; readonly edges: ReadonlySet<EdgeId> } {
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeId>();
    for (const key of keys) {
        const supplied = provenance?.[key];
        supplied?.nodes.forEach((id) => nodes.add(id));
        supplied?.edges.forEach((id) => edges.add(id));
    }

    return { nodes, edges };
}

/**
 * A provenance value with one load's entry added (or replaced).
 * @param provenance - the value before
 * @param key - the load
 * @param supplied - what it supplied, as lists or sets
 * @param supplied.nodes - the node ids
 * @param supplied.edges - the edge ids
 * @param supplied.held - the nodes it named that the graph already held
 * @returns the new value, frozen
 */
export function withSupplied(
    provenance: Provenance | undefined,
    key: SourceKey,
    supplied: { readonly nodes: Iterable<NodeId>; readonly edges: Iterable<EdgeId>; readonly held?: readonly NodeId[] },
): Provenance {
    return Object.freeze({
        ...provenance,
        [key]: Object.freeze({
            nodes: Object.freeze([...supplied.nodes]),
            edges: Object.freeze([...supplied.edges]),
            ...(supplied.held === undefined || supplied.held.length === 0
                ? {}
                : { held: Object.freeze([...supplied.held]) }),
        }),
    });
}

/**
 * A provenance value without one load.
 * @param provenance - the value before
 * @param key - the load
 * @returns the new value, frozen
 */
export function withoutSource(provenance: Provenance | undefined, key: SourceKey): Provenance {
    const { [key]: _gone, ...rest } = provenance ?? {};
    return Object.freeze(rest);
}

/**
 * Whether a value is shaped like a provenance value, for one read from a project file.
 * @param value - the value
 * @returns true when it is
 */
export function isProvenance(value: unknown): value is Provenance {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.values(value).every(
            (each: unknown) =>
                typeof each === "object" &&
                each !== null &&
                Array.isArray((each as Supplied).nodes) &&
                Array.isArray((each as Supplied).edges),
        )
    );
}
