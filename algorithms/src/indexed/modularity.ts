import { type AdjacencyView, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";

/** Options of the index-based modularity. @public */
export interface ModularityOptions {
    /** Resolution gamma: above 1 favours smaller communities; default 1. */
    readonly resolution?: number | undefined;
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/**
 * Throws when `labels` or `weights` does not fit the snapshot.
 * @param s - The snapshot
 * @param labels - The community of every node
 * @param weights - Per-arc weights, or null for all ones
 */
function checkModularityInputs(s: AdjacencyView, labels: U32, weights: NumericVector | null): void {
    if (labels.length !== s.nodeCount) {
        throw withCode(
            new RangeError(`labels has ${labels.length} entries; the snapshot has ${s.nodeCount} nodes`),
            "E_BAD_OPTION",
        );
    }
    if (weights !== null && weights.length !== s.arcCount) {
        throw withCode(
            new RangeError(`weights has ${weights.length} entries; the snapshot has ${s.arcCount} arcs`),
            "E_BAD_OPTION",
        );
    }
}

/**
 * Adds `w` to `label`'s entry, unless the label is `INVALID_INDEX`.
 * @param map - The per-community totals
 * @param label - The community
 * @param w - The weight
 */
function addTo(map: Map<number, number>, label: number, w: number): void {
    if (label !== INVALID_INDEX) {
        map.set(label, (map.get(label) ?? 0) + w);
    }
}

/** Per-community degree and inside weight, and twice the total edge weight. */
interface CommunitySums {
    readonly tot: Map<number, number>;
    readonly inside: Map<number, number>;
    m2: number;
}

/**
 * Adds the arcs of row `u` to `sums`.
 * @param s - The snapshot
 * @param labels - The community of every node
 * @param weights - Per-arc weights, or null for all ones
 * @param u - The node whose row is read
 * @param sums - The running totals, updated in place
 */
function addRow(s: AdjacencyView, labels: U32, weights: NumericVector | null, u: number, sums: CommunitySums): void {
    const end = s.rowPtr[u + 1];
    for (let a = s.rowPtr[u]; a < end; a++) {
        const v = s.colIdx[a];
        const w = weights === null ? 1 : weights[a];
        // An undirected edge between two nodes is read from both rows; a self-loop and a
        // directed arc only once, so they count double here.
        const twice = s.directed || v === u ? 2 * w : w;
        sums.m2 += twice;
        if (s.directed) {
            addTo(sums.tot, labels[u], w);
            addTo(sums.tot, labels[v], w);
        } else {
            addTo(sums.tot, labels[u], twice);
        }
        if (labels[u] === labels[v]) {
            addTo(sums.inside, labels[u], twice);
        }
    }
}

/**
 * Newman's modularity of a partition: `sum_c in_c / 2m - gamma * (tot_c / 2m)^2`, where `2m` is
 * twice the total edge weight, `in_c` counts every edge inside community c twice and `tot_c` sums
 * its nodes' weighted degrees. Degrees follow graph-format's `weightedDegree()` convention -- a
 * self-loop counts twice -- so `sum(tot_c) === 2m`. On a directed snapshot the direction is
 * ignored: every arc counts as an undirected edge, and a node's degree is its in-weight plus its
 * out-weight.
 *
 * On an undirected snapshot without self-loops this equals the legacy `calculateModularity`. On
 * a directed snapshot or one with self-loops the two differ, and this one is the NetworkX value:
 * the legacy degree counts a self-loop once and reads only out-neighbours on a directed graph, so
 * its degrees do not sum to 2m.
 *
 * It is NOT the legacy `calculateMCLModularity`, in two ways. That function subtracts the null-model
 * term `d(u) d(v) / 2m` once per edge whatever the partition: on two separate triangles it scores
 * one community and the two triangles both 1/3, where this returns 0 and 1/2. And it ignores edge
 * weights, where this reads the snapshot's weights by default; pass `weights` filled with 1 for
 * the unweighted value.
 * @param s - Any snapshot or adjacency view
 * @param labels - Community of every node; `INVALID_INDEX` leaves a node out of every community
 * @param options - Resolution and the weight override
 * @returns The modularity, 0 when the snapshot has no edge weight
 * @public
 */
export function modularity(s: AdjacencyView, labels: U32, options: ModularityOptions = {}): number {
    const resolution = options.resolution ?? 1;
    const weights = options.weights ?? s.weights;
    checkModularityInputs(s, labels, weights);
    const sums: CommunitySums = { tot: new Map(), inside: new Map(), m2: 0 };
    for (let u = 0; u < s.nodeCount; u++) {
        addRow(s, labels, weights, u, sums);
    }
    const { tot, inside, m2 } = sums;
    if (m2 === 0) {
        return 0;
    }
    let q = 0;
    for (const [label, degrees] of tot) {
        const share = degrees / m2;
        q += (inside.get(label) ?? 0) / m2 - resolution * share * share;
    }
    return q;
}
