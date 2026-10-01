/**
 * Maximum-flow networks: a grid (the image-segmentation shape), a random layered DAG, GENRMF and
 * the AK network. Every one is directed, with integer capacities as its `weights`, a `role` node
 * column and its source and sink.
 */

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { bernoulliSegment, checkEdgeCount, checkInt, checkProbability, EdgeBuffer } from "./util.js";

/** A maximum-flow instance: a directed graph whose `weights` are integer capacities. */
export interface FlowNetwork extends SampleGraph {
    /** The source node. */
    readonly source: number;
    /** The sink node. */
    readonly sink: number;
}

/**
 * The largest capacity: 2^24, the last point where every integer is exact in a Float32 weight.
 */
const MAX_CAPACITY = 2 ** 24;

/** The capacity range options of the random flow networks. */
interface CapacityOptions {
    /** The smallest arc capacity, an integer >= 0; default 1. */
    minCapacity?: number | undefined;
    /** The largest arc capacity, an integer >= minCapacity; default 10. */
    maxCapacity?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The checked capacity range.
 * @param options - the options
 * @param terminalFactor - the terminal arcs carry terminalFactor * maxCapacity, which must stay exact
 * @returns min and max
 */
function capacityRange(options: CapacityOptions, terminalFactor: number): { min: number; max: number } {
    const min = options.minCapacity ?? 1;
    const max = options.maxCapacity ?? 10;
    checkInt("minCapacity", min, 0, MAX_CAPACITY);
    checkInt("maxCapacity", max, min, Math.floor(MAX_CAPACITY / terminalFactor));
    return { min, max };
}

/**
 * Assemble a flow network.
 * @param n - the node count
 * @param out - the arcs
 * @param capacities - one capacity per arc
 * @param source - the source
 * @param sink - the sink
 * @param columns - node columns besides `role`
 * @returns the network
 */
function toNetwork(
    n: number,
    out: EdgeBuffer,
    capacities: number[],
    source: number,
    sink: number,
    columns: NonNullable<SampleGraph["nodeColumns"]>,
): FlowNetwork {
    const { src, dst } = out.finish();
    const role = new Uint8Array(n);
    role[source] = 1;
    role[sink] = 2;
    return {
        directed: true,
        nodeCount: n,
        src,
        dst,
        weights: Float32Array.from(capacities),
        nodeColumns: { ...columns, role },
        source,
        sink,
    };
}

/**
 * Push the arcs of node (r, c) of a rows x cols grid starting at `base` to its 4-neighbours, in
 * the order right, down, left, up.
 * @param out - the buffer
 * @param base - the grid's first node
 * @param rows - the row count
 * @param cols - the column count
 * @param r - the row
 * @param c - the column
 * @returns how many arcs were pushed
 */
function gridArcs(out: EdgeBuffer, base: number, rows: number, cols: number, r: number, c: number): number {
    const u = base + r * cols + c;
    const before = out.length;
    if (c + 1 < cols) {
        out.push(u, u + 1);
    }
    if (r + 1 < rows) {
        out.push(u, u + cols);
    }
    if (c > 0) {
        out.push(u, u - 1);
    }
    if (r > 0) {
        out.push(u, u - cols);
    }
    return out.length - before;
}

/** Options of {@link gridFlowNetwork}. */
export interface GridFlowOptions extends CapacityOptions {
    /** The grid's row count, >= 1. */
    rows: number;
    /** The grid's column count, >= 2. */
    cols: number;
}

/**
 * A grid flow network, the shape of graph-cut image segmentation: node r * cols + c for pixel
 * (r, c), arcs to each 4-neighbour in both directions, listed by node, in the order right, down,
 * left, up; node u draws its arcs' capacities, uniform integers in [minCapacity, maxCapacity],
 * from stream (seed, "grid-flow", u) in that order. Then the source rows * cols with an arc to
 * every left-column node (by row), and every right-column node with an arc to the sink
 * rows * cols + 1 (by row), each of capacity 4 * maxCapacity. Those terminal arcs are never a
 * minimum cut: the arcs from the first column to the second already cut the network with at most
 * rows * maxCapacity. Node columns `x` = c and `y` = r (Float64), the source at x = -1 and the
 * sink at x = cols, both at the middle row; `role` (u8: 0 inner, 1 source, 2 sink). O(rows cols).
 * @param options - rows, cols, minCapacity, maxCapacity and seed
 * @returns the flow network
 */
export function gridFlowNetwork(options: GridFlowOptions): FlowNetwork {
    const { rows, cols } = options;
    checkInt("rows", rows, 1);
    checkInt("cols", cols, 2);
    const cells = rows * cols;
    checkInt("rows * cols + 2 (the node count)", cells + 2, 0);
    const { min, max } = capacityRange(options, 4);
    const seed = resolveSeed(options.seed);
    const arcs = 2 * (rows * (cols - 1) + cols * (rows - 1)) + 2 * rows;
    checkEdgeCount(arcs);
    const out = new EdgeBuffer(arcs);
    const capacities: number[] = [];
    const stream = new RandomStream(seed, "grid-flow", 0);
    const x = new Float64Array(cells + 2);
    const y = new Float64Array(cells + 2);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const u = r * cols + c;
            x[u] = c;
            y[u] = r;
            stream.reset(u);
            const count = gridArcs(out, 0, rows, cols, r, c);
            for (let i = 0; i < count; i++) {
                capacities.push(min + stream.nextBelow(max - min + 1));
            }
        }
    }
    const source = cells;
    const sink = cells + 1;
    x[source] = -1;
    x[sink] = cols;
    y[source] = (rows - 1) / 2;
    y[sink] = (rows - 1) / 2;
    for (let r = 0; r < rows; r++) {
        out.push(source, r * cols);
        capacities.push(4 * max);
    }
    for (let r = 0; r < rows; r++) {
        out.push(r * cols + cols - 1, sink);
        capacities.push(4 * max);
    }
    return toNetwork(cells + 2, out, capacities, source, sink, { x, y });
}

/** Options of {@link layeredFlowNetwork}. */
export interface LayeredFlowOptions extends CapacityOptions {
    /** The width of every inner layer, >= 1 each; layer i holds the next `layers[i]` node indices. */
    layers: readonly number[];
    /** The probability of each arc from a node to a node of the next layer. */
    p: number;
}

/** The node layout of a layered flow network. */
interface LayeredFlowPlan {
    /** starts[i] = the first node of inner layer i; starts[L] = the inner node count. */
    readonly starts: readonly number[];
    /** The inner layer of every inner node. */
    readonly layerOf: Uint32Array;
    /** The arc probability. */
    readonly p: number;
    /** The capacity range. */
    readonly min: number;
    /** The capacity range. */
    readonly max: number;
    /** The capacity of every terminal arc: max * (the widest layer). */
    readonly terminal: number;
    /** The resolved seed. */
    readonly seed: number;
}

/**
 * Check a layered flow network's options and lay out its nodes.
 * @param options - the options
 * @returns the plan
 */
export function planLayeredFlow(options: LayeredFlowOptions): LayeredFlowPlan {
    const { layers, p } = options;
    checkInt("layers.length", layers.length, 1);
    checkProbability("p", p);
    const starts = [0];
    let widest = 0;
    for (let i = 0; i < layers.length; i++) {
        checkInt(`layers[${i}]`, layers[i], 1);
        starts.push(starts[i] + layers[i]);
        widest = Math.max(widest, layers[i]);
    }
    const inner = starts[layers.length];
    checkInt("the total size + 2 (the node count)", inner + 2, 0);
    const { min, max } = capacityRange(options, widest);
    const layerOf = new Uint32Array(inner);
    for (let i = 0; i < layers.length; i++) {
        layerOf.fill(i, starts[i], starts[i + 1]);
    }
    return { starts, layerOf, p, min, max, terminal: max * widest, seed: resolveSeed(options.seed) };
}

/**
 * Rows [start, end) of the inner arcs of a layered flow network: inner node u of a layer before
 * the last draws from stream (seed, "layered-flow", u) first its arcs to the next layer
 * (ascending, by geometric skipping), then their capacities in the same order.
 * @param plan - the plan
 * @param start - the first inner node
 * @param end - one past the last inner node
 * @param out - receives the arcs
 * @param capacities - receives their capacities
 */
export function layeredFlowRows(
    plan: LayeredFlowPlan,
    start: number,
    end: number,
    out: EdgeBuffer,
    capacities: number[],
): void {
    const { starts, layerOf, p, min, max } = plan;
    const logQ = detLog(1 - p);
    const stream = new RandomStream(plan.seed, "layered-flow", 0);
    const last = starts.length - 2;
    for (let u = start; u < end; u++) {
        const layer = layerOf[u];
        if (layer < last) {
            stream.reset(u);
            const before = out.length;
            bernoulliSegment(stream, p, logQ, u, starts[layer + 1], starts[layer + 2], out);
            for (let i = before; i < out.length; i++) {
                capacities.push(min + stream.nextBelow(max - min + 1));
            }
        }
    }
}

/**
 * A random layered flow network: inner layers as in `randomDagGraph` (arcs only from layer i to
 * layer i + 1, each with probability p, capacities uniform integers in [minCapacity,
 * maxCapacity]), a source feeding every node of the first layer and every node of the last layer
 * feeding a sink. Inner nodes come first, layer by layer; the source is node N and the sink
 * N + 1 (N inner nodes). Arcs: the inner arcs by source node (see {@link layeredFlowRows}), then
 * source -> first-layer nodes ascending, then last-layer nodes -> sink ascending; each terminal
 * arc has capacity maxCapacity * (the widest layer), at least what any one node can pass on.
 * Node column `layer` (u32): inner layer i is i + 1, the source is layer 0 and the sink layer
 * L + 1, so the column is a topological layering of the whole network; `role` (u8). O(N + m).
 * @param options - layers, p, minCapacity, maxCapacity and seed
 * @returns the flow network
 */
export function layeredFlowNetwork(options: LayeredFlowOptions): FlowNetwork {
    const plan = planLayeredFlow(options);
    const { starts } = plan;
    const L = starts.length - 1;
    const inner = starts[L];
    const out = new EdgeBuffer(inner);
    const capacities: number[] = [];
    layeredFlowRows(plan, 0, inner, out, capacities);
    const source = inner;
    const sink = inner + 1;
    const { terminal } = plan;
    for (let u = starts[0]; u < starts[1]; u++) {
        out.push(source, u);
        capacities.push(terminal);
    }
    for (let u = starts[L - 1]; u < starts[L]; u++) {
        out.push(u, sink);
        capacities.push(terminal);
    }
    const layer = new Uint32Array(inner + 2);
    for (let u = 0; u < inner; u++) {
        layer[u] = plan.layerOf[u] + 1;
    }
    layer[sink] = L + 1;
    return toNetwork(inner + 2, out, capacities, source, sink, { layer });
}

/** Options of {@link genrmfGraph}. */
export interface GenrmfOptions {
    /** The side of every frame (an a x a grid), >= 1. */
    a: number;
    /** The number of frames, >= 1. */
    b: number;
    /** The smallest capacity between frames, an integer >= 0. */
    c1: number;
    /** The largest capacity between frames, an integer >= c1; arcs inside a frame carry c2 a^2. */
    c2: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * GENRMF, the max-flow family of D. Goldfarb and M. D. Grigoriadis ("A computational comparison
 * of the Dinic and network simplex methods for maximum flow", Annals of Operations Research 13,
 * 81-123, 1988, doi:10.1007/BF02288321) as generated by Tamas Badics's `genrmf` (1991, First
 * DIMACS Implementation Challenge): b frames, each an a x a grid. Node f a^2 + r a + c is (r, c)
 * of frame f. Arcs, frame by frame: the frame's grid arcs to each 4-neighbour in both directions
 * (by node; right, down, left, up) with capacity c2 a^2; then, for f < b - 1, node j of frame f
 * -> node perm_f(j) of frame f + 1 for j ascending, with capacity uniform in [c1, c2]. Stream
 * (seed, "genrmf", f) first draws perm_f, a Fisher-Yates shuffle of 0 .. a^2 - 1 (for i = a^2 - 1
 * down to 1, swap i with nextBelow(i + 1)), then the a^2 capacities in j order. The source is
 * node 0 (the first node of the first frame), the sink the last node of the last frame. Node
 * columns `frame` (u32) and `role` (u8). Badics's own random numbers are not reproduced; the
 * structure is. O(a^2 b).
 * @param options - a, b, c1, c2 and seed
 * @returns the flow network
 */
export function genrmfGraph(options: GenrmfOptions): FlowNetwork {
    const { a, b, c1, c2 } = options;
    checkInt("a", a, 1);
    checkInt("b", b, 1);
    const side = a * a;
    checkInt("a * a * b (the node count)", side * b, 2);
    checkInt("c1", c1, 0, MAX_CAPACITY);
    checkInt("c2", c2, c1, MAX_CAPACITY);
    if (c2 * side > MAX_CAPACITY) {
        throw new RangeError(`c2 * a * a must be at most 2^24 to stay exact, got ${c2 * side}`);
    }
    const seed = resolveSeed(options.seed);
    const n = side * b;
    const arcs = b * 4 * a * (a - 1) + (b - 1) * side;
    checkEdgeCount(arcs);
    const out = new EdgeBuffer(arcs);
    const capacities: number[] = [];
    const frame = new Uint32Array(n);
    const perm = new Uint32Array(side);
    const stream = new RandomStream(seed, "genrmf", 0);
    for (let f = 0; f < b; f++) {
        const base = f * side;
        frame.fill(f, base, base + side);
        for (let r = 0; r < a; r++) {
            for (let c = 0; c < a; c++) {
                const count = gridArcs(out, base, a, a, r, c);
                for (let i = 0; i < count; i++) {
                    capacities.push(c2 * side);
                }
            }
        }
        if (f === b - 1) {
            break;
        }
        stream.reset(f);
        for (let i = 0; i < side; i++) {
            perm[i] = i;
        }
        for (let i = side - 1; i > 0; i--) {
            const j = stream.nextBelow(i + 1);
            const t = perm[i];
            perm[i] = perm[j];
            perm[j] = t;
        }
        for (let j = 0; j < side; j++) {
            out.push(base + j, base + side + perm[j]);
            capacities.push(c1 + stream.nextBelow(c2 - c1 + 1));
        }
    }
    return toNetwork(n, out, capacities, 0, n - 1, { frame });
}

/** Options of {@link akGraph}. */
export interface AkOptions {
    /** The size parameter, in [1, 499998]: 4k + 6 nodes and 6k + 7 arcs. */
    k: number;
}

/** The capacity of the AK network's terminal arcs, as in igraph's ak-4102.max instance. */
const AK_BIG = 1000000;

/**
 * The AK network of B. V. Cherkassky and A. V. Goldberg ("On implementing the push-relabel method
 * for the maximum flow problem", Algorithmica 19, 390-410, 1997, doi:10.1007/PL00009180), built to
 * be hard for push-relabel. Deterministic; n = 4k + 6 nodes, m = 6k + 7 arcs.
 *
 * Nodes: s = 0, t = 1; part A a_i = 2 + i (i = 0 .. k); a hub chain h = k + 3 .. e = 2k + 3;
 * part B b_i = 2k + 4 + i (i = 0 .. 2k + 1). Arcs, in this order: for i = 0 .. k - 1, a_i ->
 * a_{i+1} (capacity k + 1 - i) then a_i -> h (1); a_k -> e (1), a_k -> h (1); the chain j -> j + 1
 * for j = h .. e - 1 (k + 1); b_i -> b_{i+1} for i = 0 .. 2k (k); the folds b_i -> b_{2k+1-i}
 * (1) for i = 0 .. k - 1; finally s -> a_0, s -> b_0, e -> t and b_{2k+1} -> t, each 1000000.
 * The maximum flow is 2k + 3 and the largest inner capacity k + 1, so k is capped at 499998 to
 * keep the terminal capacity 1000000 from ever binding (every value is then exact in Float32).
 * Node column `role` (u8). O(k).
 * @param options - k
 * @returns the flow network
 */
export function akGraph(options: AkOptions): FlowNetwork {
    const { k } = options;
    checkInt("k", k, 1, 499998);
    const n = 4 * k + 6;
    const out = new EdgeBuffer(6 * k + 7);
    const capacities: number[] = [];
    const arc = (u: number, v: number, capacity: number): void => {
        out.push(u, v);
        capacities.push(capacity);
    };
    const hub = k + 3;
    const chainEnd = 2 * k + 3;
    const b0 = 2 * k + 4;
    for (let i = 0; i < k; i++) {
        arc(2 + i, 3 + i, k + 1 - i);
        arc(2 + i, hub, 1);
    }
    arc(2 + k, chainEnd, 1);
    arc(2 + k, hub, 1);
    for (let j = hub; j < chainEnd; j++) {
        arc(j, j + 1, k + 1);
    }
    for (let i = 0; i <= 2 * k; i++) {
        arc(b0 + i, b0 + i + 1, k);
    }
    for (let i = 0; i < k; i++) {
        arc(b0 + i, b0 + 2 * k + 1 - i, 1);
    }
    arc(0, 2, AK_BIG);
    arc(0, b0, AK_BIG);
    arc(chainEnd, 1, AK_BIG);
    arc(b0 + 2 * k + 1, 1, AK_BIG);
    return toNetwork(n, out, capacities, 0, 1, {});
}
