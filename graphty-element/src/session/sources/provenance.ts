/**
 * @file Which load supplied each node and edge: the `provenance` graph value, kept beside
 * `sources` so undo, redo and a project file move it with the graph, and the lookups the session
 * reads it through. An element two loads both supplied is listed under both.
 */

import type { EdgeId, NodeId, SourceKey } from "../../catalog/types";

/** The graph value holding what each load supplied. */
export const PROVENANCE_VALUE = "provenance";

/** What one load supplied: the node ids and edge ids its rows named, held or not. */
export interface Supplied {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
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
 * Every element's loads, by id, built once per provenance value.
 * @param provenance - the value, or undefined when no load recorded one
 * @returns the index
 */
export function provenanceIndex(provenance: Provenance | undefined): ProvenanceIndex {
    if (provenance === undefined) {
        return EMPTY;
    }

    let index = indexes.get(provenance);
    if (index === undefined) {
        const nodes = new Map<NodeId, SourceKey[]>();
        const edges = new Map<EdgeId, SourceKey[]>();
        for (const [key, supplied] of Object.entries(provenance)) {
            for (const id of supplied.nodes) {
                nodes.set(id, [...(nodes.get(id) ?? []), key]);
            }

            for (const id of supplied.edges) {
                edges.set(id, [...(edges.get(id) ?? []), key]);
            }
        }

        index = { nodes, edges };
        indexes.set(provenance, index);
    }

    return index;
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
 * @param supplied - what it supplied
 * @returns the new value, frozen
 */
export function withSupplied(provenance: Provenance | undefined, key: SourceKey, supplied: Supplied): Provenance {
    return Object.freeze({
        ...provenance,
        [key]: Object.freeze({ nodes: Object.freeze([...supplied.nodes]), edges: Object.freeze([...supplied.edges]) }),
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
