/**
 * Directed random graphs: stochastic Kronecker graphs and R-MAT (the recursive-matrix family behind
 * the Graph500 benchmark), Price's citation network and the random-order DAG.
 */

import { type U32 } from "@graphty/graph-format";

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { type EdgePolicy } from "./degree-sequence.js";
import {
    bernoulliSegment,
    binomialBuffer,
    checkEdgeCount,
    checkInt,
    checkProbability,
    EdgeBuffer,
    toGraph,
} from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** The options R-MAT and Kronecker graphs share. */
interface RecursiveOptions extends WeightOptions {
    /** Self-loops: "keep" (the default) or "erase" them. */
    selfLoops?: EdgePolicy | undefined;
    /**
     * Repeated pairs: "keep" (the default) or "erase" all but the first occurrence in edge order.
     * For an undirected graph (u, v) and (v, u) are the same pair.
     */
    multiEdges?: EdgePolicy | undefined;
    /** Relabel the nodes by a uniformly random permutation, as Graph500 does; default false. */
    permute?: boolean | undefined;
    /** Whether the graph is directed; default true. */
    directed?: boolean | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Throw unless `value` is undefined or a duplicate policy.
 * @param name - the option name
 * @param value - the value
 */
function checkPolicy(name: string, value: EdgePolicy | undefined): void {
    if (value !== undefined && value !== "keep" && value !== "erase") {
        throw new RangeError(`${name} must be "keep" or "erase", got ${String(value)}`);
    }
}

/**
 * Apply `permute`, `selfLoops` and `multiEdges` to freshly sampled edges, then build the graph.
 * The permutation is a Fisher-Yates shuffle of 0 .. n - 1 (for i = n - 1 down to 1, swap i with
 * nextBelow(i + 1)) from stream (seed, permuteDomain, 0); node u becomes perm[u]. Erasing keeps
 * the first occurrence of a pair in edge order, and is not affected by the relabelling.
 * @param n - the node count
 * @param src - the sources, in edge order
 * @param dst - the targets
 * @param options - the options
 * @param seed - the resolved seed
 * @param permuteDomain - the permutation's stream domain
 * @returns the graph (before weights)
 */
function finishRecursive(
    n: number,
    src: U32,
    dst: U32,
    options: RecursiveOptions,
    seed: number,
    permuteDomain: string,
): SampleGraph {
    const directed = options.directed ?? true;
    const m = src.length;
    if (options.permute === true) {
        const perm = new Uint32Array(n);
        for (let i = 0; i < n; i++) {
            perm[i] = i;
        }
        const stream = new RandomStream(seed, permuteDomain, 0);
        for (let i = n - 1; i > 0; i--) {
            const j = stream.nextBelow(i + 1);
            const t = perm[i];
            perm[i] = perm[j];
            perm[j] = t;
        }
        for (let e = 0; e < m; e++) {
            src[e] = perm[src[e]];
            dst[e] = perm[dst[e]];
        }
    }
    const keep = new Uint8Array(m).fill(1);
    if (options.selfLoops === "erase") {
        for (let e = 0; e < m; e++) {
            if (src[e] === dst[e]) {
                keep[e] = 0;
            }
        }
    }
    if (options.multiEdges === "erase") {
        const lo = directed ? src : src.map((u, e) => Math.min(u, dst[e]));
        const hi = directed ? dst : src.map((u, e) => Math.max(u, dst[e]));
        // ponytail: O(m log m) comparator sort of edge indices; a hash set if erasing 100M+ edges matters
        const order = new Uint32Array(m);
        for (let e = 0; e < m; e++) {
            order[e] = e;
        }
        order.sort((a, b) => lo[a] - lo[b] || hi[a] - hi[b] || a - b);
        for (let i = 1; i < m; i++) {
            const a = order[i - 1];
            const b = order[i];
            if (lo[a] === lo[b] && hi[a] === hi[b]) {
                keep[b] = 0;
            }
        }
    }
    const out = new EdgeBuffer(m);
    for (let e = 0; e < m; e++) {
        if (keep[e] === 1) {
            out.push(src[e], dst[e]);
        }
    }
    return toGraph(n, out, directed);
}

/**
 * Check the options R-MAT and Kronecker graphs share.
 * @param options - the options
 * @returns the resolved seed
 */
function checkRecursive(options: RecursiveOptions): number {
    checkPolicy("selfLoops", options.selfLoops);
    checkPolicy("multiEdges", options.multiEdges);
    return resolveSeed(options.seed);
}

/** Options of {@link kroneckerGraph}. */
export interface KroneckerOptions extends RecursiveOptions {
    /** The k x k initiator matrix, k >= 1, entries in [0, 1]. */
    initiator: readonly (readonly number[])[];
    /** The Kronecker power, in [1, 64]; the graph has k^power nodes. */
    power: number;
    /** The number of edges to sample; default round((sum of the initiator)^power). */
    edges?: number | undefined;
}

/**
 * A stochastic Kronecker graph (J. Leskovec, D. Chakrabarti, J. Kleinberg, C. Faloutsos and
 * Z. Ghahramani, "Kronecker graphs: an approach to modeling networks", JMLR 11, 985-1042, 2010)
 * by their fast O(E power) sampling: n = k^power nodes and E = round(S^power) edges, S the sum of
 * the initiator (S^power by repeated multiplication), unless `edges` is given. Edge e draws from
 * stream (seed, "kronecker", e): `power` descents, most significant first, each drawing
 * u = nextFloat() and picking the first initiator cell (row-major) whose cumulative entry over S
 * exceeds u; cell (r, c) appends digit r to the source and c to the target in base k. Edges are
 * listed in sampling order. A multigraph unless erased: see `selfLoops`, `multiEdges`, `permute`
 * (stream (seed, "kronecker-permute", 0)) and `directed`.
 * @param options - initiator, power, edges, the shared recursive options and seed
 * @returns the graph
 */
export function kroneckerGraph(options: KroneckerOptions): SampleGraph {
    const { initiator, power } = options;
    const k = initiator.length;
    checkInt("initiator.length", k, 1);
    let sum = 0;
    for (let r = 0; r < k; r++) {
        checkInt(`initiator[${r}].length`, initiator[r].length, k, k);
        for (const value of initiator[r]) {
            checkProbability(`initiator[${r}] entries`, value);
            sum += value;
        }
    }
    checkInt("power", power, 1, 64);
    let n = 1;
    let mean = 1;
    for (let i = 0; i < power; i++) {
        n *= k;
        mean *= sum;
    }
    checkInt("k^power (the node count)", n, 1);
    const m = options.edges ?? Math.round(mean);
    checkEdgeCount(m);
    checkInt("edges", m, 0);
    if (m > 0 && sum === 0) {
        throw new RangeError("edges must be 0 when the initiator is all zeros");
    }
    const seed = checkRecursive(options);
    // cumulative table over S; from the last positive cell on it is exactly 1, so u < 1 always hits
    const cells = k * k;
    const cumulative = new Float64Array(cells);
    let partial = 0;
    let lastPositive = 0;
    for (let i = 0; i < cells; i++) {
        const value = initiator[Math.floor(i / k)][i % k];
        partial += value;
        cumulative[i] = partial / sum;
        if (value > 0) {
            lastPositive = i;
        }
    }
    cumulative.fill(1, lastPositive);
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const stream = new RandomStream(seed, "kronecker", 0);
    for (let e = 0; e < m; e++) {
        stream.reset(e);
        let u = 0;
        let v = 0;
        for (let level = 0; level < power; level++) {
            const x = stream.nextFloat();
            let cell = 0;
            while (x >= cumulative[cell]) {
                cell++;
            }
            u = u * k + Math.floor(cell / k);
            v = v * k + (cell % k);
        }
        src[e] = u;
        dst[e] = v;
    }
    return applyWeights(finishRecursive(n, src, dst, options, seed, "kronecker-permute"), options);
}

/** Options of {@link rmatGraph}. */
export interface RmatOptions extends RecursiveOptions {
    /** log2 of the node count, in [0, 31]. */
    scale: number;
    /** Edges per node, an integer >= 0; default 16 (Graph500). */
    edgeFactor?: number | undefined;
    /** The top-left quadrant probability; default 0.57 (Graph500). */
    a?: number | undefined;
    /** The top-right quadrant probability; default 0.19. */
    b?: number | undefined;
    /** The bottom-left quadrant probability; default 0.19. */
    c?: number | undefined;
    /** The bottom-right quadrant probability; default 0.05. a + b + c + d must be 1. */
    d?: number | undefined;
}

/**
 * R-MAT (D. Chakrabarti, Y. Zhan and C. Faloutsos, "R-MAT: a recursive model for graph mining",
 * SIAM SDM 2004, 442-446, doi:10.1137/1.9781611972740.43) with Graph500's defaults: n = 2^scale
 * nodes and m = edgeFactor n edges in O(m scale). Edge e draws from stream (seed, "rmat", e):
 * `scale` levels, most significant bit first, each comparing one nextFloat() with a, a + b and
 * a + b + c to pick the top-left, top-right, bottom-left or else bottom-right quadrant (bit 0/1 of
 * the source for top/bottom, of the target for left/right). Edges are listed in sampling order.
 * A multigraph with self-loops unless erased: see `selfLoops`, `multiEdges`, `permute` (stream
 * (seed, "rmat-permute", 0)) and `directed`.
 *
 * webgpu-graph-algorithms carries three private R-MAT copies on xorshift / LCG streams
 * (benchmarks/datasets.ts, test/helpers/graphs.ts, demo/main.ts) that should move to this. Two
 * of them move a self-loop to (u, (v + 1) mod n), keeping exactly m edges; `selfLoops: "erase"`
 * drops the loop instead (about m / n^0.4 fewer edges at the defaults), and `weights: { kind:
 * "integer", min: 1, max: 10 }` reproduces their 1..10 weights. The third keeps self-loops, which
 * is this function's default.
 * @param options - scale, edgeFactor, a, b, c, d, the shared recursive options and seed
 * @returns the graph
 */
export function rmatGraph(options: RmatOptions): SampleGraph {
    const { scale } = options;
    const edgeFactor = options.edgeFactor ?? 16;
    const a = options.a ?? 0.57;
    const b = options.b ?? 0.19;
    const c = options.c ?? 0.19;
    const d = options.d ?? 0.05;
    checkInt("scale", scale, 0, 31);
    checkInt("edgeFactor", edgeFactor, 0);
    checkProbability("a", a);
    checkProbability("b", b);
    checkProbability("c", c);
    checkProbability("d", d);
    if (Math.abs(a + b + c + d - 1) > 1e-9) {
        throw new RangeError(`a + b + c + d must be 1, got ${a + b + c + d}`);
    }
    const n = 2 ** scale;
    const m = edgeFactor * n;
    checkEdgeCount(m);
    const seed = checkRecursive(options);
    const ab = a + b;
    const abc = a + b + c;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const stream = new RandomStream(seed, "rmat", 0);
    for (let e = 0; e < m; e++) {
        stream.reset(e);
        let u = 0;
        let v = 0;
        for (let level = 0; level < scale; level++) {
            const x = stream.nextFloat();
            u *= 2;
            v *= 2;
            if (x < a) {
                // top-left
            } else if (x < ab) {
                v += 1;
            } else if (x < abc) {
                u += 1;
            } else {
                u += 1;
                v += 1;
            }
        }
        src[e] = u;
        dst[e] = v;
    }
    return applyWeights(finishRecursive(n, src, dst, options, seed, "rmat-permute"), options);
}

/** Options of {@link priceGraph}. */
export interface PriceOptions extends WeightOptions {
    /** The node count, >= 1. */
    n: number;
    /** The number of earlier nodes each new node cites, >= 1 (fewer while fewer exist). */
    citations: number;
    /** The attractiveness a > 0 added to every in-degree; default 1. */
    attractiveness?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Price's citation network (D. J. de S. Price, "Networks of scientific papers", Science 149,
 * 510-515, 1965, doi:10.1126/science.149.3683.510; "A general theory of bibliometric and other
 * cumulative advantage processes", J. Am. Soc. Inf. Sci. 27, 292-306, 1976): a directed acyclic
 * graph with arcs from the citing (newer) node to the cited (older) one, in-degrees following a
 * power law with exponent 2 + a / m.
 *
 * Node t = 1 .. n - 1 cites min(m, t) distinct earlier nodes, each chosen with probability
 * proportional to in-degree + a, the in-degrees as they were when t arrived. When t <= m it cites
 * every earlier node, ascending, without drawing. Otherwise, with E arcs made before t, every draw
 * takes x = nextFloat() * (E + a t) and then, if x < E, the target of a uniformly chosen earlier
 * arc (nextBelow(E) into the list of cited targets), else a uniform node nextBelow(t); a node t
 * already cites is redrawn. All draws come from the single stream (seed, "price", 0): the process
 * is sequential. Arcs are listed by citing node, in draw order. O(n m) expected.
 * @param options - n, citations, attractiveness and seed
 * @returns the directed graph
 */
export function priceGraph(options: PriceOptions): SampleGraph {
    const { n, citations: m } = options;
    const attractiveness = options.attractiveness ?? 1;
    checkInt("n", n, 1);
    checkInt("citations", m, 1);
    if (!(attractiveness > 0 && Number.isFinite(attractiveness))) {
        throw new RangeError(`attractiveness must be a positive number, got ${String(attractiveness)}`);
    }
    const seed = resolveSeed(options.seed);
    const full = Math.min(m, n);
    const edgeCount = (full * (full - 1)) / 2 + (n - full) * m;
    checkEdgeCount(edgeCount);
    const stream = new RandomStream(seed, "price", 0);
    const out = new EdgeBuffer(edgeCount);
    const citedBy = new Int32Array(n).fill(-1);
    for (let t = 1; t < n; t++) {
        const arcs = out.length;
        if (t <= m) {
            for (let v = 0; v < t; v++) {
                out.push(t, v);
            }
            continue;
        }
        const total = arcs + attractiveness * t;
        for (let found = 0; found < m; ) {
            const x = stream.nextFloat() * total;
            const v = x < arcs ? out.dst[stream.nextBelow(arcs)] : stream.nextBelow(t);
            if (citedBy[v] !== t) {
                citedBy[v] = t;
                out.push(t, v);
                found++;
            }
        }
    }
    return applyWeights(toGraph(n, out, true), options);
}

/** Options of {@link randomOrderDagGraph}. */
export interface RandomOrderDagOptions extends WeightOptions {
    /** The node count, >= 0. */
    n: number;
    /** The probability of each arc i -> j, i < j, in [0, 1]. */
    p: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Rows [start, end) of the random-order DAG: row u draws from stream (seed, "order-dag", u) and
 * holds the arcs u -> v, v = u + 1 .. n - 1 chosen, ascending. Any split of [0, n) into
 * consecutive ranges concatenates to the whole graph's arc list.
 * @param options - the generator's options (already checked)
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the arcs
 */
export function orderDagRows(options: RandomOrderDagOptions, start: number, end: number, out: EdgeBuffer): void {
    const { n, p } = options;
    const logQ = detLog(1 - p);
    const stream = new RandomStream(resolveSeed(options.seed), "order-dag", 0);
    for (let u = start; u < end; u++) {
        stream.reset(u);
        bernoulliSegment(stream, p, logQ, u, u + 1, n, out);
    }
}

/**
 * The random-order DAG: a directed G(n, p) restricted to the arcs i -> j with i < j, so node
 * index order is a topological order (B. Karrer and M. E. J. Newman, "Random acyclic networks",
 * Phys. Rev. Lett. 102, 128701, 2009, doi:10.1103/PhysRevLett.102.128701). O(n + m) by geometric
 * skipping; arcs in row-major order, see {@link orderDagRows}.
 * @param options - n, p and seed
 * @returns the directed acyclic graph
 */
export function randomOrderDagGraph(options: RandomOrderDagOptions): SampleGraph {
    const { n, p } = options;
    checkInt("n", n, 0);
    checkProbability("p", p);
    resolveSeed(options.seed);
    const out = binomialBuffer((n * (n - 1)) / 2, p);
    orderDagRows(options, 0, n, out);
    return applyWeights(toGraph(n, out, true), options);
}
