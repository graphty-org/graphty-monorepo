import {
    type AdjacencyView,
    type F64,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeRef,
    type NumericVector,
    resolveNode,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { walkPredArcs, walkPredEdges } from "./dijkstra.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/** Options of the point-to-point searches. @public */
export interface PathOptions {
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
 * The weight of `arc`, 1 when there are no weights.
 * @param weights - Per-arc weights, or null for all ones
 * @param arc - The arc
 * @returns The weight
 */
function arcWeight(weights: NumericVector | null, arc: number): number {
    return weights === null ? 1 : weights[arc];
}

/** The state of one bidirectional Dijkstra, built once per call. */
interface BidirectionalState {
    readonly s: GraphSnapshot;
    readonly rev: ReturnType<GraphSnapshot["reverse"]>;
    readonly weights: NumericVector | null;
    readonly distF: Float64Array;
    readonly distB: Float64Array;
    /**
     * Forward: the arc into each node. Backward: the reverse-view arc that reached each node from
     * its successor toward the target -- on an undirected snapshot that arc points the other way,
     * so the successor node is kept too rather than read off the arc.
     */
    readonly predArc: Uint32Array;
    readonly succRevArc: Uint32Array;
    readonly succNode: Uint32Array;
    readonly heapF: IndexedMinHeap;
    readonly heapB: IndexedMinHeap;
    best: number;
    /** The step joining the two searches: meetFrom -> meetTo over logical edge meetEdge. */
    meetFrom: number;
    meetTo: number;
    meetEdge: number;
    meetWeight: number;
}

/**
 * Records the step `from -> to` over `edge` as the best meeting so far.
 * @param st - The run state, updated in place
 * @param best - The path length through the step
 * @param from - The node on the source side
 * @param to - The node on the target side
 * @param edge - The logical edge of the step
 * @param w - The weight
 */
function meet(st: BidirectionalState, best: number, from: number, to: number, edge: number, w: number): void {
    st.best = best;
    st.meetFrom = from;
    st.meetTo = to;
    st.meetEdge = edge;
    st.meetWeight = w;
}

/**
 * Closes the forward search's next node and relaxes its out-arcs.
 * @param st - The run state, updated in place
 */
function forwardStep(st: BidirectionalState): void {
    const { s, distF, distB, predArc, heapF } = st;
    const u = heapF.pop();
    for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
        const v = s.colIdx[a];
        const w = arcWeight(st.weights, a);
        const dv = distF[u] + w;
        if (dv < distF[v]) {
            distF[v] = dv;
            predArc[v] = a;
            heapF.pushOrDecrease(v, dv);
        }
        if (dv + distB[v] < st.best) {
            meet(st, dv + distB[v], u, v, s.arcToEdge[a], w);
        }
    }
}

/**
 * Closes the backward search's next node and relaxes its in-arcs.
 * @param st - The run state, updated in place
 */
function backwardStep(st: BidirectionalState): void {
    const { rev, distF, distB, succRevArc, succNode, heapB } = st;
    const v = heapB.pop();
    for (let k = rev.rowPtr[v]; k < rev.rowPtr[v + 1]; k++) {
        const u = rev.colIdx[k];
        const w = arcWeight(st.weights, rev.fwdArc[k]);
        const du = distB[v] + w;
        if (du < distB[u]) {
            distB[u] = du;
            succRevArc[u] = k;
            succNode[u] = v;
            heapB.pushOrDecrease(u, du);
        }
        if (distF[u] + du < st.best) {
            meet(st, distF[u] + du, u, v, rev.arcToEdge[k], w);
        }
    }
}

/**
 * The path through the meeting step, with its distance summed source end first.
 * @param st - The run state, updated in place
 * @param source - The source node
 * @param target - The target node
 * @returns The distance, the node path and its logical edges
 */
function joinedPath(st: BidirectionalState, source: number, target: number): PathResult {
    const { s, rev, weights, predArc, succRevArc, succNode } = st;
    const nodes: number[] = [];
    const edges: number[] = [];
    const steps: number[] = []; // the weight of each edge, source end first
    for (let node = st.meetFrom; node !== source; node = s.arcSource(predArc[node])) {
        nodes.push(node);
        edges.push(s.arcToEdge[predArc[node]]);
        steps.push(arcWeight(weights, predArc[node]));
    }
    nodes.push(source);
    nodes.reverse();
    edges.reverse();
    steps.reverse();
    edges.push(st.meetEdge);
    steps.push(st.meetWeight);
    nodes.push(st.meetTo);
    for (let node = st.meetTo; node !== target; node = succNode[node]) {
        edges.push(rev.arcToEdge[succRevArc[node]]);
        steps.push(arcWeight(weights, rev.fwdArc[succRevArc[node]]));
        nodes.push(succNode[node]);
    }
    let distance = 0;
    for (const w of steps) {
        distance += w;
    }
    return { distance, path: Uint32Array.from(nodes), edges: Uint32Array.from(edges) };
}

/**
 * Bidirectional Dijkstra between two nodes: one search forward from the source, one backward from
 * the target over `reverse()`, each step taken by the side whose next key is smaller, stopping once
 * the two next keys sum to at least the best path found. That is the point-to-point query legacy
 * `dijkstraPath` answers. The path is recorded as ARCS, so a parallel edge on it is the exact edge.
 * @param s - The snapshot to search
 * @param sourceNode - The node to start from: its index, or `{ id }`
 * @param targetNode - The node to reach: its index, or `{ id }`
 * @param options - Per-arc weight override
 * @returns The distance, the node path and the logical edges on it
 * @throws Error when any weight is negative
 * @public
 */
export function bidirectionalDijkstra(
    s: GraphSnapshot,
    sourceNode: NodeRef,
    targetNode: NodeRef,
    options: PathOptions = {},
): PathResult {
    const source = resolveNode(s, sourceNode);
    const target = resolveNode(s, targetNode);
    if (source === target) {
        return { distance: 0, path: Uint32Array.of(source), edges: new Uint32Array(0) };
    }
    const n = s.nodeCount;
    const weights: NumericVector | null = options.weights ?? s.weights;
    // Checked up front, not per relaxed arc: the search stops early, so a per-arc check would miss
    // a negative edge beyond the meeting point that legacy (which runs both searches out) refuses.
    if (weights?.some((w) => w < 0) === true) {
        throw withCode(new Error("Bidirectional Dijkstra does not support negative edge weights"), "E_BAD_WEIGHT");
    }
    const st: BidirectionalState = {
        s,
        rev: s.reverse(),
        weights,
        distF: new Float64Array(n).fill(Infinity),
        distB: new Float64Array(n).fill(Infinity),
        predArc: new Uint32Array(n).fill(INVALID_INDEX),
        succRevArc: new Uint32Array(n).fill(INVALID_INDEX),
        succNode: new Uint32Array(n).fill(INVALID_INDEX),
        heapF: new IndexedMinHeap(n),
        heapB: new IndexedMinHeap(n),
        best: Infinity,
        meetFrom: INVALID_INDEX,
        meetTo: INVALID_INDEX,
        meetEdge: INVALID_INDEX,
        meetWeight: 0,
    };
    st.distF[source] = 0;
    st.distB[target] = 0;
    st.heapF.push(source, 0);
    st.heapB.push(target, 0);
    while (st.heapF.peekKey() + st.heapB.peekKey() < st.best) {
        if (st.heapF.peekKey() <= st.heapB.peekKey()) {
            forwardStep(st);
        } else {
            backwardStep(st);
        }
    }
    return st.meetFrom === INVALID_INDEX ? NO_PATH : joinedPath(st, source, target);
}

/**
 * Relax every arc out of the just-closed node `u` to a node not yet closed, lowering its cost so far,
 * its score and its queue key when the arc improves on them.
 * @param g - The adjacency being searched
 * @param u - The node just taken from the queue
 * @param weights - Per-arc weights, or null for all ones
 * @param estimate - Estimated remaining cost from a node index to the target
 * @param st - The search state, updated in place
 * @param st.gScore - Cost so far per node
 * @param st.fScore - Cost so far plus the estimate, per node
 * @param st.predArc - The relaxing arc per node
 * @param st.closed - 1 for every expanded node
 * @param st.heap - The queue, keyed by `fScore`
 */
function relaxAstarArcs(
    g: AdjacencyView,
    u: number,
    weights: NumericVector | null,
    estimate: (node: number) => number,
    st: { gScore: Float64Array; fScore: Float64Array; predArc: Uint32Array; closed: Uint8Array; heap: IndexedMinHeap },
): void {
    const { gScore, fScore, predArc, closed, heap } = st;
    for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
        const v = g.colIdx[a];
        if (closed[v] === 1) {
            continue;
        }
        const tentative = gScore[u] + (weights === null ? 1 : weights[a]);
        if (tentative < gScore[v]) {
            gScore[v] = tentative;
            fScore[v] = tentative + estimate(v);
            predArc[v] = a;
            heap.pushOrDecrease(v, fScore[v]);
        }
    }
}

/**
 * A* between two nodes: Dijkstra keyed by cost so far plus `heuristic(node, target)`, stopping when
 * the target is taken from the queue. An expanded node is never reopened, as in legacy `astar`, so
 * the path is shortest when the heuristic is consistent. The predecessor is the relaxing ARC, so a
 * parallel edge on the path is the exact edge.
 * @param g - The adjacency to search
 * @param sourceNode - The node to start from: its index, or `{ id }`
 * @param targetNode - The node to reach: its index, or `{ id }`
 * @param heuristic - Estimated remaining cost from a node index to the target index
 * @param options - Per-arc weight override
 * @returns The path, plus the per-node scores and the expansion order
 * @public
 */
export function astar(
    g: AdjacencyView,
    sourceNode: NodeRef,
    targetNode: NodeRef,
    heuristic: (node: number, target: number) => number,
    options: PathOptions = {},
): AstarResult {
    const source = resolveNode(g, sourceNode);
    const target = resolveNode(g, targetNode);
    const n = g.nodeCount;
    if (!(target >= 0 && target < n)) {
        throw withCode(
            new RangeError(`Target index ${String(target)} is outside the graph's ${String(n)} nodes`),
            "E_BAD_NODE",
        );
    }
    const weights: NumericVector | null = options.weights ?? g.weights;
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
        relaxAstarArcs(g, u, weights, (v) => heuristic(v, target), { gScore, fScore, predArc, closed, heap });
    }
    const state = { gScore, fScore, visited: Uint32Array.from(visited) };
    if (gScore[target] === Infinity) {
        return { ...NO_PATH, ...state };
    }
    const path = walkPredArcs(g, predArc, source, target);
    return { distance: gScore[target], path, edges: walkPredEdges(g, predArc, source, target), ...state };
}
