import { type AdjacencyView, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { arcSourceIn } from "./structures/arc-source.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/**
 * Single-source shortest paths, index-based (graph-format design 14.2 Port 2, line 3860).
 * `dist` is a `NumericVector` rather than the design's `F64` because ONE declaration serves both
 * the CPU port (which produces a `Float64Array`) and the dispatcher's decoration of an
 * accelerator's f32 result (plan decision PD-3, departure DEP-8A-C).
 * @public
 */
export interface SsspResult {
    /** Distance per node; +Infinity for unreached nodes. */
    readonly dist: NumericVector;
    /** The ARC that relaxed each node; INVALID_INDEX for the source and for unreached nodes. */
    readonly predArc: U32;
    /**
     * Node indices from the source to `target` inclusive; empty when `target` is unreached.
     * @param target - The node index to walk back from
     */
    pathTo(target: number): U32;
    /**
     * LOGICAL EDGE indices along that path, one fewer than `pathTo`; this is what graphty-element's
     * `isInPath` writes through. Empty when `target` is unreached.
     * @param target - The node index to walk back from
     */
    pathEdges(target: number): U32;
}

/** Options of the index-based SSSP. @public */
export interface SsspOptions {
    /** Stop relaxing beyond this distance. */
    readonly cutoff?: number | undefined;
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/**
 * Walk the predecessor arcs back from `target` and return the node path, source first.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from
 * @returns Node indices from source to target inclusive, or an empty array when unreached
 * @public
 */
export function walkPredArcs(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source) {
        return Uint32Array.of(source);
    }
    if (predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    const reversed: number[] = [target];
    let node = target;
    while (node !== source) {
        node = arcSourceIn(g.rowPtr, predArc[node]);
        reversed.push(node);
    }
    const out = new Uint32Array(reversed.length);
    for (let i = 0; i < reversed.length; i++) {
        out[i] = reversed[reversed.length - 1 - i];
    }
    return out;
}

/**
 * Walk the predecessor arcs back from `target` and return the logical edges on the path.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from
 * @returns Logical edge indices from source to target, or an empty array when unreached
 * @public
 */
export function walkPredEdges(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source || predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    const reversed: number[] = [];
    let node = target;
    while (node !== source) {
        const arc = predArc[node];
        reversed.push(g.arcToEdge[arc]); // the EXACT parallel edge, not a (u, v) lookup
        node = arcSourceIn(g.rowPtr, arc);
    }
    const out = new Uint32Array(reversed.length);
    for (let i = 0; i < reversed.length; i++) {
        out[i] = reversed[reversed.length - 1 - i];
    }
    return out;
}

/**
 * Dijkstra over an adjacency view, with the predecessor recorded as the relaxing ARC so a parallel
 * edge on the path is identified exactly.
 * @param g - The adjacency to search
 * @param source - The node index to start from
 * @param options - Cutoff and per-arc weight override
 * @returns The distances, the predecessor arcs, and the two path accessors
 * @public
 */
export function dijkstra(g: AdjacencyView, source: number, options: SsspOptions = {}): SsspResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const weights: NumericVector | null = options.weights ?? g.weights;
    const dist = new Float64Array(nodeCount).fill(Infinity);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const heap = new IndexedMinHeap(nodeCount);
    const cutoff = options.cutoff ?? Infinity;
    dist[source] = 0;
    heap.push(source, 0);
    while (!heap.isEmpty()) {
        const u = heap.pop();
        const du = dist[u];
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const w = weights === null ? 1 : weights[a];
            const v = colIdx[a];
            const dv = du + w;
            if (dv < dist[v] && dv <= cutoff) {
                dist[v] = dv;
                predArc[v] = a;
                heap.pushOrDecrease(v, dv);
            }
        }
    }
    return {
        dist,
        predArc,
        pathTo: (target: number): U32 => walkPredArcs(g, predArc, source, target),
        pathEdges: (target: number): U32 => walkPredEdges(g, predArc, source, target),
    };
}
