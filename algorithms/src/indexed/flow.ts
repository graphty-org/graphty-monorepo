import {
    fromEdgeArrays,
    GraphBuilder,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskTest,
    type NodeId,
    type NodeMask,
    type NodeRef,
    type NumericVector,
    resolveNode,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { type LabelResult, withGroups } from "./components.js";

/** Options of {@link maxFlow} and {@link minSTCut}. @public */
export interface MaxFlowOptions {
    /**
     * How augmenting paths are found: `"edmonds-karp"` (breadth-first, shortest paths first,
     * O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Default `"edmonds-karp"` for
     * {@link maxFlow} and `"ford-fulkerson"` for {@link minSTCut}. Both give the same source side
     * and the same flow value up to floating-point rounding; the per-edge flows can differ where
     * the maximum flow is not unique.
     */
    readonly algorithm?: "edmonds-karp" | "ford-fulkerson" | undefined;
    /**
     * Per-arc capacity override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`
     * for exact f64 capacities. Without it the snapshot's arc weights are the capacities, and an
     * unweighted snapshot gives every edge capacity 1.
     */
    readonly weights?: NumericVector | undefined;
}

/**
 * The two sides of a cut as a partition in first-seen order: node 0's side is label 0.
 * @param mask - One side, as a node mask
 * @param n - The node count
 * @returns The partition, with `count` 2 (1 when every node is on one side, 0 for no node)
 */
export function sidesPartition(mask: NodeMask, n: number): LabelResult {
    const labels = new Uint32Array(n);
    const first = n > 0 && maskTest(mask, 0);
    let mixed = false;
    for (let i = 0; i < n; i++) {
        if (maskTest(mask, i) !== first) {
            labels[i] = 1;
            mixed = true;
        }
    }
    if (n === 0) {
        return withGroups(labels, 0);
    }
    return withGroups(labels, mixed ? 2 : 1);
}

/**
 * Result of {@link maxFlow}. As a `LabelResult` it is the minimum cut's two sides, the source's side first.
 * @public
 */
export interface MaxFlowResult extends LabelResult {
    /** The value of the maximum flow. */
    readonly maxFlow: number;
    /**
     * Net flow per logical edge in its declared orientation. On an undirected snapshot a negative
     * value is flow from the declared target to the declared source.
     */
    readonly flow: Float64Array;
    /** The nodes reachable from the source in the final residual graph: the source side of a minimum cut. */
    readonly sourceSide: NodeMask;
    /**
     * Logical edges with positive capacity that cross the cut, in edge order: from the source side
     * to the other on a directed snapshot, with exactly one endpoint on the source side on an
     * undirected one.
     */
    readonly cutEdges: U32;
}

/**
 * Result of the index-based minimum cuts ({@link minSTCut}, `stoerWagner`, `kargerMinCut`). As a `LabelResult` it
 * is the cut's two sides, node 0's side first.
 * @public
 */
export interface MinCutResult extends LabelResult {
    /** The total weight of the cut. */
    readonly cutValue: number;
    /** One side of the cut; every other node is on the other side. */
    readonly side: NodeMask;
    /** Logical edges with one endpoint on each side, in edge order. */
    readonly cutEdges: U32;
}

/**
 * The capacity of every logical edge: the override's value at the edge's declared arc, else the
 * snapshot's per-edge weight, else 1.
 * @param s - The snapshot
 * @param weights - The optional per-arc override
 * @returns One capacity per logical edge
 */
export function edgeCapacities(s: GraphSnapshot, weights: NumericVector | undefined): Float64Array {
    const el = s.edgeList();
    const out = new Float64Array(s.edgeCount);
    for (let e = 0; e < s.edgeCount; e++) {
        out[e] = weights !== undefined ? weights[el.arc[e]] : (el.weights?.[e] ?? 1);
    }
    return out;
}

/**
 * The logical edges whose endpoints lie on different sides of `side` -- leaving it, when
 * `directed` -- with positive capacity when `positiveOnly` is set.
 * @param s - The snapshot
 * @param side - One side of the cut
 * @param directed - Whether only edges from `side` to the other side count
 * @param capacity - Per-edge capacities, consulted only with `positiveOnly`
 * @param positiveOnly - Whether to leave out edges of capacity zero or less
 * @returns Edge indices in edge order
 */
export function crossingEdges(
    s: GraphSnapshot,
    side: NodeMask,
    directed: boolean,
    capacity: Float64Array,
    positiveOnly: boolean,
): U32 {
    const { src, dst } = s.edgeList();
    const out: number[] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        const inSrc = maskTest(side, src[e]);
        const crosses = directed ? inSrc && !maskTest(side, dst[e]) : inSrc !== maskTest(side, dst[e]);
        if (crosses && (!positiveOnly || capacity[e] > 0)) {
            out.push(e);
        }
    }
    return Uint32Array.from(out);
}

/**
 * The residual graph, kept per NODE PAIR: every arc from u to v is one entry.
 *
 * The residual snapshot is built with `fromEdgeArrays` over `[edges ++ reversed edges]`, so the
 * twin of residual edge `r` is `r + E` below E and `r - E` above it (graph-format design 14.2's
 * flow rule). A directed edge's reversed copy has capacity 0; an undirected edge carries its
 * capacity both ways, so both copies are real. Rows are sorted by target, so the arcs from u to v
 * are one contiguous GROUP, named by its first arc, and all residual state is per group: the
 * capacities of parallel arcs, and of an undirected edge's two directions, add up. That is the
 * legacy Map-of-Maps residual exactly, where `residual.get(u).get(v)` is one number per pair, and
 * it is why the design's four-copy undirected layout is not needed.
 */
interface Residual {
    readonly rowPtr: U32;
    readonly colIdx: U32;
    /** Residual edge of every arc. */
    readonly arcToEdge: U32;
    /** Residual capacity per group, at the group's first arc. */
    readonly capacity: Float64Array;
    /** The group of every arc. */
    readonly groupOf: U32;
    /** The group of the opposite pair (v to u), per group. */
    readonly twin: U32;
    /**
     * Per node, the groups in the order a search visits them, in the node's own arc range:
     * `order[rowPtr[u] .. rowPtr[u] + placed[u])`.
     */
    readonly order: U32;
    readonly placed: U32;
    /** Whether a group is in its row's visiting order yet. */
    readonly inOrder: Uint8Array;
    /** Whether a group holds at least one real (non-reverse) arc. */
    readonly real: Uint8Array;
}

/**
 * Build the pair-keyed residual graph of `s`. The visiting order starts as the legacy
 * `graphToMap` row order -- each neighbour at the first edge that joins it -- and a group with no
 * real arc is appended to its row when flow first reaches it, where the legacy residual Map
 * inserts the key.
 * @param s - The snapshot
 * @param capacity - Per-edge capacities
 * @returns The residual graph
 */
function buildResidual(s: GraphSnapshot, capacity: Float64Array): Residual {
    const n = s.nodeCount;
    const E = s.edgeCount;
    const { src, dst } = s.edgeList();
    const rSrc = new Uint32Array(2 * E);
    const rDst = new Uint32Array(2 * E);
    rSrc.set(src);
    rSrc.set(dst, E);
    rDst.set(dst);
    rDst.set(src, E);
    const r = fromEdgeArrays({ directed: true, nodeCount: n, src: rSrc, dst: rDst });
    const { rowPtr, colIdx, arcToEdge, edgeToArc } = r;
    const A = r.arcCount;
    const residual = new Float64Array(A);
    const groupOf = new Uint32Array(A);
    const real = new Uint8Array(A);
    for (let u = 0; u < n; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const g = a > rowPtr[u] && colIdx[a] === colIdx[a - 1] ? groupOf[a - 1] : a;
            groupOf[a] = g;
            const re = arcToEdge[a];
            if (re < E || !s.directed) {
                real[g] = 1;
                residual[g] += Math.max(capacity[re < E ? re : re - E], 0);
            }
        }
    }
    const twin = new Uint32Array(A);
    for (let a = 0; a < A; a++) {
        if (groupOf[a] === a) {
            const re = arcToEdge[a];
            twin[a] = groupOf[edgeToArc[re < E ? re + E : re - E]];
        }
    }
    const order = new Uint32Array(A);
    const placed = new Uint32Array(n);
    const inOrder = new Uint8Array(A);
    const place = (u: number, g: number): void => {
        if (inOrder[g] === 0) {
            inOrder[g] = 1;
            order[rowPtr[u] + placed[u]++] = g;
        }
    };
    for (let e = 0; e < E; e++) {
        place(src[e], groupOf[edgeToArc[e]]);
        if (!s.directed) {
            place(dst[e], groupOf[edgeToArc[e + E]]);
        }
    }
    return { rowPtr, colIdx, arcToEdge, capacity: residual, groupOf, twin, order, placed, inOrder, real };
}

/**
 * Maximum flow from `source` to `sink` by augmenting paths.
 *
 * Paths, bottlenecks and per-edge flows equal the legacy `edmondsKarp` / `fordFulkerson` on a
 * graph with no parallel edges and no two opposite directed edges: the residual is kept per node
 * pair and searched in the legacy row order (see {@link buildResidual}). Where two opposite
 * directed edges carry flow, legacy records every push on the edge in the push's direction, so
 * one edge can show more flow than its capacity; this port reports the net flow of the pair on
 * the edges in its direction instead, each within its capacity.
 * @param s - The snapshot
 * @param sourceNode - The source node: its index, or `{ id }`
 * @param sinkNode - The sink node: its index, or `{ id }`
 * @param options - The path search and the capacity override
 * @returns The flow value, the per-edge flows, the source side and the cut edges
 * @throws RangeError when `source` or `sink` is not a node index, or they are the same node
 * @public
 */
export function maxFlow(
    s: GraphSnapshot,
    sourceNode: NodeRef,
    sinkNode: NodeRef,
    options: MaxFlowOptions = {},
): MaxFlowResult {
    const source = resolveNode(s, sourceNode);
    const sink = resolveNode(s, sinkNode);
    const n = s.nodeCount;
    if (!(Number.isInteger(source) && source >= 0 && source < n && Number.isInteger(sink) && sink >= 0 && sink < n)) {
        throw withCode(
            new RangeError(`source ${String(source)} and sink ${String(sink)} must be node indices below ${n}`),
            "E_BAD_NODE",
        );
    }
    if (source === sink) {
        throw withCode(new RangeError(`source and sink are the same node (${source})`), "E_BAD_OPTION");
    }
    const capacity = edgeCapacities(s, options.weights);
    const r = buildResidual(s, capacity);
    const { colIdx, twin } = r;
    // Flow pushed per real group, accumulated as the legacy flow Map accumulates it: a push along
    // a pair with a real arc adds to that pair, a push along a reverse-only pair subtracts from
    // the opposite one.
    const pushed = new Float64Array(colIdx.length);
    const predGroup = new Uint32Array(n);
    const findPath = options.algorithm === "ford-fulkerson" ? depthFirstPath : breadthFirstPath;
    let total = 0;
    while (findPath(r, source, sink, predGroup)) {
        let bottleneck = Infinity;
        for (let v = sink; v !== source; v = colIdx[twin[predGroup[v]]]) {
            bottleneck = Math.min(bottleneck, r.capacity[predGroup[v]]);
        }
        for (let v = sink; v !== source; ) {
            const g = predGroup[v];
            const t = twin[g];
            r.capacity[g] -= bottleneck;
            r.capacity[t] += bottleneck;
            if (r.inOrder[t] === 0) {
                r.inOrder[t] = 1;
                r.order[r.rowPtr[v] + r.placed[v]++] = t;
            }
            if (r.real[g] === 1) {
                pushed[g] += bottleneck;
            } else {
                pushed[t] -= bottleneck;
            }
            v = colIdx[t];
        }
        total += bottleneck;
    }
    const sourceSide = reachable(r, source);
    return {
        ...sidesPartition(sourceSide, s.nodeCount),
        maxFlow: total,
        flow: edgeFlows(s, r, capacity, pushed),
        sourceSide,
        cutEdges: crossingEdges(s, sourceSide, s.directed, capacity, true),
    };
}

/**
 * Spread each pair's net flow over its logical edges: all of it on the pair's only edge in the
 * flow's direction, and in arc order up to capacity where there are several (the last one takes
 * the remainder, so rounding never drops flow).
 * @param s - The snapshot
 * @param r - The residual graph after the last augmentation
 * @param capacity - Per-edge capacities
 * @param pushed - Flow pushed per real group
 * @returns Net flow per logical edge in its declared orientation
 */
function edgeFlows(s: GraphSnapshot, r: Residual, capacity: Float64Array, pushed: Float64Array): Float64Array {
    const E = s.edgeCount;
    const flow = new Float64Array(E);
    const { rowPtr, colIdx, arcToEdge, groupOf } = r;
    for (let u = 0; u < s.nodeCount; u++) {
        for (let g = rowPtr[u]; g < rowPtr[u + 1]; g++) {
            const v = colIdx[g];
            if (groupOf[g] !== g || v <= u) {
                continue;
            }
            const net = pushed[g] - pushed[r.twin[g]];
            if (net === 0) {
                continue;
            }
            // Walk the arcs of the group the flow runs along: u to v, or v to u.
            const along = net > 0 ? g : r.twin[g];
            const end = rowPtr[colIdx[r.twin[along]] + 1];
            let remaining = Math.abs(net);
            let lastEdge = -1;
            let lastSign = 1;
            for (let a = along; a < end && groupOf[a] === along; a++) {
                const re = arcToEdge[a];
                if (re >= E && s.directed) {
                    continue; // a reverse arc carries no edge
                }
                if (lastEdge >= 0) {
                    const x = Math.min(remaining, Math.max(capacity[lastEdge], 0));
                    flow[lastEdge] += lastSign * x;
                    remaining -= x;
                }
                lastEdge = re < E ? re : re - E;
                lastSign = re < E ? 1 : -1;
            }
            if (lastEdge >= 0) {
                flow[lastEdge] += lastSign * remaining;
            }
        }
    }
    return flow;
}

/**
 * Minimum s-t cut: the source side and value of a maximum flow (max-flow min-cut theorem). The
 * side is the set reachable from the source in the final residual graph, which is the same for
 * every maximum flow, so the path search does not change it. The search defaults to
 * `"ford-fulkerson"`, as the legacy `minSTCut` uses: on weights that are not binary fractions
 * another search adds the bottlenecks in another order and the value can differ in its last bits.
 * @param s - The snapshot
 * @param sourceNode - The source node: its index, or `{ id }`
 * @param sinkNode - The sink node: its index, or `{ id }`
 * @param options - The path search and the capacity override
 * @returns The cut value, the source side and the cut edges
 * @throws RangeError as {@link maxFlow} does
 * @public
 */
export function minSTCut(
    s: GraphSnapshot,
    sourceNode: NodeRef,
    sinkNode: NodeRef,
    options: MaxFlowOptions = {},
): MinCutResult {
    const source = resolveNode(s, sourceNode);
    const sink = resolveNode(s, sinkNode);
    const r = maxFlow(s, source, sink, { ...options, algorithm: options.algorithm ?? "ford-fulkerson" });
    return {
        ...sidesPartition(r.sourceSide, s.nodeCount),
        cutValue: r.maxFlow,
        side: r.sourceSide,
        cutEdges: r.cutEdges,
    };
}

/**
 * Breadth-first search for a source-to-sink path over groups with residual capacity, stopping when
 * the sink is discovered (its parent is fixed then, as in the legacy search that stops when it
 * dequeues the sink).
 * @param r - The residual graph
 * @param source - The source node index
 * @param sink - The sink node index
 * @param predGroup - Receives the group that discovered each node on the path
 * @returns Whether the sink was reached
 */
function breadthFirstPath(r: Residual, source: number, sink: number, predGroup: U32): boolean {
    const { rowPtr, colIdx, order, placed, capacity } = r;
    predGroup.fill(INVALID_INDEX);
    const queue = new Uint32Array(predGroup.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = source;
    while (head < tail) {
        const u = queue[head++];
        const end = rowPtr[u] + placed[u];
        for (let k = rowPtr[u]; k < end; k++) {
            const g = order[k];
            const v = colIdx[g];
            if (capacity[g] > 0 && v !== source && predGroup[v] === INVALID_INDEX) {
                predGroup[v] = g;
                if (v === sink) {
                    return true;
                }
                queue[tail++] = v;
            }
        }
    }
    return false;
}

/**
 * Depth-first search for a source-to-sink path over groups with residual capacity, in the order a
 * recursive search takes: the first group with capacity to an unvisited node is followed to its
 * end before the next is tried.
 * @param r - The residual graph
 * @param source - The source node index
 * @param sink - The sink node index
 * @param predGroup - Receives the group that entered each node on the path
 * @returns Whether the sink was reached
 */
function depthFirstPath(r: Residual, source: number, sink: number, predGroup: U32): boolean {
    const { rowPtr, colIdx, order, placed, capacity } = r;
    const n = predGroup.length;
    predGroup.fill(INVALID_INDEX);
    const visited = new Uint8Array(n);
    const stack = new Uint32Array(n);
    const cursor = new Uint32Array(n);
    let depth = 0;
    stack[depth++] = source;
    visited[source] = 1;
    cursor[source] = rowPtr[source];
    while (depth > 0) {
        const u = stack[depth - 1];
        const k = cursor[u]++;
        if (k >= rowPtr[u] + placed[u]) {
            depth--;
            continue;
        }
        const g = order[k];
        const v = colIdx[g];
        if (capacity[g] > 0 && visited[v] === 0) {
            predGroup[v] = g;
            if (v === sink) {
                return true;
            }
            visited[v] = 1;
            cursor[v] = rowPtr[v];
            stack[depth++] = v;
        }
    }
    return false;
}

/**
 * The nodes reachable from `source` over groups with residual capacity.
 * @param r - The residual graph
 * @param source - The source node index
 * @returns The reachable set as a node mask
 */
function reachable(r: Residual, source: number): NodeMask {
    const { rowPtr, colIdx, order, placed, capacity } = r;
    const n = rowPtr.length - 1;
    const mask = makeMask(n);
    const queue = new Uint32Array(n);
    let head = 0;
    let tail = 0;
    queue[tail++] = source;
    maskSet(mask, source, true);
    while (head < tail) {
        const u = queue[head++];
        const end = rowPtr[u] + placed[u];
        for (let k = rowPtr[u]; k < end; k++) {
            const v = colIdx[order[k]];
            if (capacity[order[k]] > 0 && !maskTest(mask, v)) {
                maskSet(mask, v, true);
                queue[tail++] = v;
            }
        }
    }
    return mask;
}

/** Result of {@link bipartiteFlowNetwork}. @public */
export interface BipartiteFlowNetwork {
    /** The directed, unit-capacity (unweighted) flow network. */
    readonly snapshot: GraphSnapshot;
    /** The index of the added source node, id `"__source__"`. */
    readonly source: number;
    /** The index of the added sink node, id `"__sink__"`. */
    readonly sink: number;
}

const SOURCE_ID = "__source__";
const SINK_ID = "__sink__";

/**
 * The unit-capacity flow network whose maximum flow is a maximum bipartite matching: a source with
 * an edge to every left node, every given left-right edge, and an edge from every right node to a
 * sink. Nodes are numbered source, left nodes, left endpoints of `edges` not already listed, right
 * nodes, right endpoints not already listed, sink; a repeated edge is kept once.
 * @param left - The left side's node ids
 * @param right - The right side's node ids
 * @param edges - Left-to-right edges as `[left id, right id]`
 * @returns The network and the indices of its source and sink
 * @throws RangeError when a given id is `"__source__"` or `"__sink__"`
 * @public
 */
export function bipartiteFlowNetwork(
    left: readonly NodeId[],
    right: readonly NodeId[],
    edges: readonly (readonly [NodeId, NodeId])[],
): BipartiteFlowNetwork {
    const b = new GraphBuilder({ directed: true, duplicateEdges: "first" });
    const add = (id: NodeId): number => {
        if (id === SOURCE_ID || id === SINK_ID) {
            throw withCode(
                new RangeError(`node id "${id}" is reserved for the flow network's source or sink`),
                "E_BAD_OPTION",
            );
        }
        return b.addNode(id);
    };
    const source = b.addNode(SOURCE_ID);
    const leftIndex = left.map(add);
    const edgeLeft = edges.map(([u]) => add(u));
    const rightIndex = right.map(add);
    const edgeRight = edges.map(([, v]) => add(v));
    const sink = b.addNode(SINK_ID);
    for (const u of leftIndex) {
        b.addEdgeByIndex(source, u);
    }
    for (let e = 0; e < edges.length; e++) {
        b.addEdgeByIndex(edgeLeft[e], edgeRight[e]);
    }
    for (const v of rightIndex) {
        b.addEdgeByIndex(v, sink);
    }
    return { snapshot: b.freeze({ label: "algorithms.bipartiteFlowNetwork" }), source, sink };
}
