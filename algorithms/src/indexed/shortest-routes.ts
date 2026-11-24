import {
    type AdjacencyView,
    INVALID_INDEX,
    type NodeRef,
    type NumericVector,
    resolveNode,
    type U32,
} from "@graphty/graph-format";

import { checkWeights } from "../errors.js";
import { IndexedMinHeap } from "./structures/min-heap.js";
import type { WeightedOptions } from "./weights.js";

/** Options of {@link countShortestPaths}. @public */
export interface CountShortestPathsOptions extends WeightedOptions {
    /** Per-arc weight override, arcCount long; the view's own weights (or 1 each) when absent. */
    readonly weights?: NumericVector | undefined;
    /**
     * How close, relative to the larger cost, two costs must be to tie. Default 1e-6, which absorbs
     * the rounding of an f32 distance from an accelerator.
     */
    readonly tolerance?: number | undefined;
}

/**
 * How many distinct cheapest routes lead from the source to each node, given the distances a
 * single-source search computed over the same view and weights. An arc lies on a cheapest route
 * when `dist[u] + w` equals `dist[v]`; the counts are summed over those arcs in topological order.
 * @param g - The adjacency the search ran on
 * @param dist - The search's distances, nodeCount long
 * @param sourceNode - The search's source: its index, or `{ id }`
 * @param options - Weight override and tie tolerance
 * @returns Routes per node: 1 for the source, 0 for an unreached node, Infinity for a node behind a
 *   cycle of zero-weight edges (which ties with itself forever)
 * @public
 */
export function countShortestPaths(
    g: AdjacencyView,
    dist: NumericVector,
    sourceNode: NodeRef,
    options: CountShortestPathsOptions = {},
): Float64Array {
    const source = resolveNode(g, sourceNode);
    const { nodeCount, rowPtr, colIdx } = g;
    const weights = options.weighted === false ? null : (options.weights ?? g.weights);
    const tolerance = options.tolerance ?? 1e-6;
    const tight = (u: number, a: number): boolean => {
        const v = colIdx[a];
        const via = dist[u] + (weights === null ? 1 : weights[a]);
        return Number.isFinite(via) && Math.abs(via - dist[v]) <= tolerance * Math.max(1, Math.abs(dist[v]));
    };

    // Kahn's order over the tight arcs: a node is counted once every tight arc into it has been.
    const pending = tightInDegree(g, tight);

    const count = new Float64Array(nodeCount);
    const done = new Uint8Array(nodeCount);
    count[source] = 1;
    const queue: number[] = [];
    for (let u = 0; u < nodeCount; u++) {
        if (pending[u] === 0 && Number.isFinite(dist[u])) {
            queue.push(u);
        }
    }
    for (let head = 0; head < queue.length; head++) {
        const u = queue[head];
        done[u] = 1;
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            if (tight(u, a)) {
                const v = colIdx[a];
                count[v] += count[u];
                if (--pending[v] === 0) {
                    queue.push(v);
                }
            }
        }
    }
    // A reached node Kahn never freed sits on, or behind, a zero-weight cycle of cheapest routes.
    return count.map((routes, u) => (done[u] === 0 && Number.isFinite(dist[u]) ? Infinity : routes));
}

/**
 * How many tight arcs enter each node.
 * @param g - The adjacency
 * @param tight - Whether arc `a` out of node `u` lies on a cheapest route
 * @returns The in-degree per node over the tight arcs
 */
function tightInDegree(g: AdjacencyView, tight: (u: number, a: number) => boolean): Uint32Array {
    const { nodeCount, rowPtr, colIdx } = g;
    const pending = new Uint32Array(nodeCount);
    for (let u = 0; u < nodeCount; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            if (tight(u, a)) {
                pending[colIdx[a]]++;
            }
        }
    }
    return pending;
}

/**
 * The cheapest arc arriving at each node, and its cost.
 * @param nodeCount - The node count
 * @param colIdx - The arcs' targets
 * @param cost - The cheapest route ending over each arc
 * @returns The cost per node (+Infinity when unreached) and the arc (INVALID_INDEX when unreached)
 */
function cheapestArrivals(
    nodeCount: number,
    colIdx: U32,
    cost: Float64Array,
): { dist: Float64Array; last: Uint32Array } {
    const dist = new Float64Array(nodeCount).fill(Infinity);
    const last = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    for (let a = 0; a < cost.length; a++) {
        if (cost[a] < dist[colIdx[a]]) {
            dist[colIdx[a]] = cost[a];
            last[colIdx[a]] = a;
        }
    }
    return { dist, last };
}

/** Options of {@link timeOrderedPaths}. @public */
export interface TimeOrderedPathsOptions extends WeightedOptions {
    /**
     * The time of every arc, arcCount long. A route takes its arcs in non-decreasing time; an arc
     * whose time is NaN or infinite is never taken.
     */
    readonly times: NumericVector;
    /** Per-arc weight override, arcCount long; the view's own weights (or 1 each) when absent. */
    readonly weights?: NumericVector | undefined;
}

/** The cheapest time-respecting routes from one source. @public */
export interface TimeOrderedPathsResult {
    /** The cost of the cheapest time-respecting route to each node; +Infinity for unreached nodes. */
    readonly dist: Float64Array;
    /**
     * Node indices from the source to `target` inclusive; empty when `target` is unreached.
     * @param target - The node: its index, or `{ id }`
     */
    pathTo(target: NodeRef): U32;
    /**
     * Logical edge indices along that route, one fewer than `pathTo`.
     * @param target - The node: its index, or `{ id }`
     */
    pathEdges(target: NodeRef): U32;
}

/**
 * Cheapest routes that take their edges in time order: each arc's time is at or after the time of
 * the arc before it. Each search state is an arc (the route arrived over it), so a node reached
 * early but expensively is kept apart from the same node reached late but cheaply.
 * @param g - The adjacency to search
 * @param sourceNode - The node to start from: its index, or `{ id }`
 * @param options - The arc times and an optional weight override
 * @returns The costs and the two route accessors
 * @throws RangeError with code `E_BAD_WEIGHT` when a weight is negative, NaN or infinite
 * @public
 */
export function timeOrderedPaths(
    g: AdjacencyView,
    sourceNode: NodeRef,
    options: TimeOrderedPathsOptions,
): TimeOrderedPathsResult {
    const source = resolveNode(g, sourceNode);
    const { nodeCount, rowPtr, colIdx, arcToEdge } = g;
    const { times } = options;
    const weights = options.weighted === false ? null : (options.weights ?? g.weights);
    checkWeights("timeOrderedPaths", weights, colIdx.length);
    const arcCount = colIdx.length;
    const weightOf = (a: number): number => (weights === null ? 1 : weights[a]);

    // cost[a]: the cheapest route that ends by crossing arc a; prev[a]: the arc before it.
    const cost = new Float64Array(arcCount).fill(Infinity);
    const prev = new Uint32Array(arcCount).fill(INVALID_INDEX);
    // The earliest time a route already expanded arrived at each node: a later, dearer one is dominated.
    const earliest = new Float64Array(nodeCount).fill(Infinity);
    const heap = new IndexedMinHeap(arcCount);
    for (let a = rowPtr[source]; a < rowPtr[source + 1]; a++) {
        if (Number.isFinite(times[a]) && weightOf(a) < cost[a]) {
            cost[a] = weightOf(a);
            heap.pushOrDecrease(a, cost[a]);
        }
    }
    while (!heap.isEmpty()) {
        const a = heap.pop();
        const v = colIdx[a];
        if (times[a] >= earliest[v]) {
            continue;
        }
        earliest[v] = times[a];
        for (let b = rowPtr[v]; b < rowPtr[v + 1]; b++) {
            const via = cost[a] + weightOf(b);
            if (Number.isFinite(times[b]) && times[b] >= times[a] && via < cost[b]) {
                cost[b] = via;
                prev[b] = a;
                heap.pushOrDecrease(b, via);
            }
        }
    }

    const { dist, last } = cheapestArrivals(nodeCount, colIdx, cost);
    dist[source] = 0;
    last[source] = INVALID_INDEX;

    const arcsTo = (targetNode: NodeRef): number[] | null => {
        const target = resolveNode(g, targetNode);
        if (target === source) {
            return [];
        }
        if (last[target] === INVALID_INDEX) {
            return null;
        }
        const arcs: number[] = [];
        for (let a = last[target]; a !== INVALID_INDEX; a = prev[a]) {
            arcs.push(a);
        }
        return arcs.reverse();
    };

    return {
        dist,
        pathTo: (target) => {
            const arcs = arcsTo(target);
            return arcs === null ? new Uint32Array(0) : Uint32Array.from([source, ...arcs.map((a) => colIdx[a])]);
        },
        pathEdges: (target) => Uint32Array.from((arcsTo(target) ?? []).map((a) => arcToEdge[a])),
    };
}
