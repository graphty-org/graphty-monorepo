import {
    type AdjacencyView,
    type F64,
    type GraphSnapshot,
    INVALID_INDEX,
    type NumericVector,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { walkPredArcs, walkPredEdges } from "./dijkstra.js";
import { IndexedMinHeap } from "./structures/min-heap.js";
import type { WeightedOptions } from "./weights.js";

/** Options of the point-to-point searches. @public */
export interface PathOptions extends WeightedOptions {
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/** One shortest path between two nodes. @public */
export interface PathResult {
    /** Sum of the path's weights, added from the source; Infinity when the target is unreachable. */
    readonly distance: number;
    /** Node indices from the source to the target inclusive; empty when unreachable. */
    readonly path: U32;
    /** Logical edge indices along the path, one fewer than `path`: the exact parallel edge taken. */
    readonly edges: U32;
}

/** A* result: the path plus the search state the legacy `astarWithDetails` reports. @public */
export interface AstarResult extends PathResult {
    /** Best known cost from the source per node; Infinity for a node the search never reached. */
    readonly gScore: F64;
    /** `gScore` plus the heuristic, per node; Infinity for a node the search never reached. */
    readonly fScore: F64;
    /** Nodes expanded, in expansion order; the target is not expanded, so it is not listed. */
    readonly visited: U32;
}

const NO_PATH: PathResult = { distance: Infinity, path: new Uint32Array(0), edges: new Uint32Array(0) };

/**
 * Bidirectional Dijkstra between two nodes: one search forward from the source, one backward from
 * the target over `reverse()`, each step taken by the side whose next key is smaller, stopping once
 * the two next keys sum to at least the best path found. That is the point-to-point query legacy
 * `dijkstraPath` answers. The path is recorded as ARCS, so a parallel edge on it is the exact edge.
 * @param s - The snapshot to search
 * @param source - The node index to start from
 * @param target - The node index to reach
 * @param options - Per-arc weight override
 * @returns The distance, the node path and the logical edges on it
 * @throws Error when any weight is negative
 * @public
 */
export function bidirectionalDijkstra(
    s: GraphSnapshot,
    source: number,
    target: number,
    options: PathOptions = {},
): PathResult {
    if (source === target) {
        return { distance: 0, path: Uint32Array.of(source), edges: new Uint32Array(0) };
    }
    const n = s.nodeCount;
    const weights: NumericVector | null = options.weighted === false ? null : (options.weights ?? s.weights);
    // Checked up front, not per relaxed arc: the search stops early, so a per-arc check would miss
    // a negative edge beyond the meeting point that legacy (which runs both searches out) refuses.
    if (weights?.some((w) => w < 0) === true) {
        throw withCode(new Error("Bidirectional Dijkstra does not support negative edge weights"), "E_BAD_WEIGHT");
    }
    const rev = s.reverse();
    const weightOf = (arc: number): number => (weights === null ? 1 : weights[arc]);
    const distF = new Float64Array(n).fill(Infinity);
    const distB = new Float64Array(n).fill(Infinity);
    // Forward: the arc into each node. Backward: the reverse-view arc that reached each node from
    // its successor toward the target -- on an undirected snapshot that arc points the other way,
    // so the successor node is kept too rather than read off the arc.
    const predArc = new Uint32Array(n).fill(INVALID_INDEX);
    const succRevArc = new Uint32Array(n).fill(INVALID_INDEX);
    const succNode = new Uint32Array(n).fill(INVALID_INDEX);
    const heapF = new IndexedMinHeap(n);
    const heapB = new IndexedMinHeap(n);
    distF[source] = 0;
    distB[target] = 0;
    heapF.push(source, 0);
    heapB.push(target, 0);
    let best = Infinity;
    // The step joining the two searches: meetFrom -> meetTo over logical edge meetEdge.
    let meetFrom = INVALID_INDEX;
    let meetTo = INVALID_INDEX;
    let meetEdge = INVALID_INDEX;
    let meetWeight = 0;

    while (heapF.peekKey() + heapB.peekKey() < best) {
        if (heapF.peekKey() <= heapB.peekKey()) {
            const u = heapF.pop();
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                const v = s.colIdx[a];
                const w = weightOf(a);
                const dv = distF[u] + w;
                if (dv < distF[v]) {
                    distF[v] = dv;
                    predArc[v] = a;
                    heapF.pushOrDecrease(v, dv);
                }
                if (dv + distB[v] < best) {
                    best = dv + distB[v];
                    [meetFrom, meetTo, meetEdge, meetWeight] = [u, v, s.arcToEdge[a], w];
                }
            }
        } else {
            const v = heapB.pop();
            for (let k = rev.rowPtr[v]; k < rev.rowPtr[v + 1]; k++) {
                const u = rev.colIdx[k];
                const w = weightOf(rev.fwdArc[k]);
                const du = distB[v] + w;
                if (du < distB[u]) {
                    distB[u] = du;
                    succRevArc[u] = k;
                    succNode[u] = v;
                    heapB.pushOrDecrease(u, du);
                }
                if (distF[u] + du < best) {
                    best = distF[u] + du;
                    [meetFrom, meetTo, meetEdge, meetWeight] = [u, v, rev.arcToEdge[k], w];
                }
            }
        }
    }
    if (meetFrom === INVALID_INDEX) {
        return NO_PATH;
    }
    const nodes: number[] = [];
    const edges: number[] = [];
    const steps: number[] = []; // the weight of each edge, source end first
    for (let node = meetFrom; node !== source; node = s.arcSource(predArc[node])) {
        nodes.push(node);
        edges.push(s.arcToEdge[predArc[node]]);
        steps.push(weightOf(predArc[node]));
    }
    nodes.push(source);
    nodes.reverse();
    edges.reverse();
    steps.reverse();
    edges.push(meetEdge);
    steps.push(meetWeight);
    nodes.push(meetTo);
    for (let node = meetTo; node !== target; node = succNode[node]) {
        edges.push(rev.arcToEdge[succRevArc[node]]);
        steps.push(weightOf(rev.fwdArc[succRevArc[node]]));
        nodes.push(succNode[node]);
    }
    let distance = 0;
    for (const w of steps) {
        distance += w;
    }
    return { distance, path: Uint32Array.from(nodes), edges: Uint32Array.from(edges) };
}

/**
 * A* between two nodes: Dijkstra keyed by cost so far plus `heuristic(node, target)`, stopping when
 * the target is taken from the queue. An expanded node is never reopened, as in legacy `astar`, so
 * the path is shortest when the heuristic is consistent. The predecessor is the relaxing ARC, so a
 * parallel edge on the path is the exact edge.
 * @param g - The adjacency to search
 * @param source - The node index to start from
 * @param target - The node index to reach
 * @param heuristic - Estimated remaining cost from a node index to the target index
 * @param options - Per-arc weight override
 * @returns The path, plus the per-node scores and the expansion order
 * @public
 */
export function astar(
    g: AdjacencyView,
    source: number,
    target: number,
    heuristic: (node: number, target: number) => number,
    options: PathOptions = {},
): AstarResult {
    const n = g.nodeCount;
    if (!(target >= 0 && target < n)) {
        throw withCode(
            new RangeError(`Target index ${String(target)} is outside the graph's ${String(n)} nodes`),
            "E_BAD_NODE",
        );
    }
    const weights: NumericVector | null = options.weighted === false ? null : (options.weights ?? g.weights);
    const gScore = new Float64Array(n).fill(Infinity);
    const fScore = new Float64Array(n).fill(Infinity);
    const predArc = new Uint32Array(n).fill(INVALID_INDEX);
    const closed = new Uint8Array(n);
    const visited: number[] = [];
    const heap = new IndexedMinHeap(n);
    gScore[source] = 0;
    fScore[source] = heuristic(source, target);
    heap.push(source, fScore[source]);
    while (!heap.isEmpty()) {
        const u = heap.pop();
        if (u === target) {
            break;
        }
        closed[u] = 1;
        visited.push(u);
        for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
            const v = g.colIdx[a];
            if (closed[v] === 1) {
                continue;
            }
            const tentative = gScore[u] + (weights === null ? 1 : weights[a]);
            if (tentative < gScore[v]) {
                gScore[v] = tentative;
                fScore[v] = tentative + heuristic(v, target);
                predArc[v] = a;
                heap.pushOrDecrease(v, fScore[v]);
            }
        }
    }
    const state = { gScore, fScore, visited: Uint32Array.from(visited) };
    if (gScore[target] === Infinity) {
        return { ...NO_PATH, ...state };
    }
    const path = walkPredArcs(g, predArc, source, target);
    return { distance: gScore[target], path, edges: walkPredEdges(g, predArc, source, target), ...state };
}
