import { type AdjacencyView, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";

import { PathWalkError } from "../errors.js";
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
 * The arcs from `target` back to `source`, target end first. `predArc` may come from an
 * accelerator, so it is not trusted: a missing or out-of-range arc, or more than nodeCount - 1
 * steps, throws rather than walking off the array or looping.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from (reached, and not the source)
 * @returns Arc indices, target end first
 */
function walkBack(g: AdjacencyView, predArc: U32, source: number, target: number): number[] {
    const arcs: number[] = [];
    let node = target;
    while (node !== source) {
        if (arcs.length >= g.nodeCount - 1) {
            throw new PathWalkError(source, target, "cycle");
        }
        const arc = predArc[node];
        if (!(arc < g.arcCount)) {
            throw new PathWalkError(source, target, "gap"); // INVALID_INDEX is past arcCount too
        }
        arcs.push(arc);
        node = arcSourceIn(g.rowPtr, arc);
    }
    return arcs;
}

/**
 * Walk the predecessor arcs back from `target` and return the node path, source first.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from
 * @returns Node indices from source to target inclusive, or an empty array when unreached
 * @throws PathWalkError when `predArc` has a gap or a cycle between `target` and `source`
 * @public
 */
export function walkPredArcs(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source) {
        return Uint32Array.of(source);
    }
    if (predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    const reversed = [target, ...walkBack(g, predArc, source, target).map((arc) => arcSourceIn(g.rowPtr, arc))];
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
 * @throws PathWalkError when `predArc` has a gap or a cycle between `target` and `source`
 * @public
 */
export function walkPredEdges(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source || predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    // the EXACT parallel edge, not a (u, v) lookup
    const reversed = walkBack(g, predArc, source, target).map((arc) => g.arcToEdge[arc]);
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
