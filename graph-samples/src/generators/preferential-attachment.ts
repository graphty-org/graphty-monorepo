/**
 * Growth models: Barabasi-Albert preferential attachment with the Holme-Kim triad-formation step,
 * and the Watts-Strogatz small world.
 */

import { checkSeed, RandomStream } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";

/** Options of {@link barabasiAlbertGraph}. */
export interface BarabasiAlbertOptions {
    /** The node count, > m. */
    n: number;
    /** The number of edges each new node brings, >= 1. */
    m: number;
    /**
     * Holme-Kim: after each preferential edge, the probability that the next of the node's m edges
     * closes a triangle with a neighbour of that edge's target instead. 0 (the default) is plain
     * Barabasi-Albert.
     */
    triadProbability?: number | undefined;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * Barabasi-Albert preferential attachment (A.-L. Barabasi and R. Albert, "Emergence of scaling in
 * random networks", Science 286, 509-512, 1999), optionally with triad formation (P. Holme and
 * B. J. Kim, "Growing scale-free networks with tunable clustering", Phys. Rev. E 65, 026107, 2002),
 * in O(n m) with the repeated-endpoint list of Batagelj and Brandes (2005).
 *
 * The algorithm is networkx's `powerlaw_cluster_graph`, which is `barabasi_albert_graph` when the
 * triad probability is 0: start from m isolated nodes 0 .. m - 1 whose repeated list holds each
 * once; each new node s = m .. n - 1 draws m distinct targets uniformly from the repeated list
 * (in draw order), then adds m edges (s, t): the first to the first target; each further one, with
 * probability `triadProbability`, to a uniformly chosen neighbour of the previous target that s is
 * not yet joined to, otherwise to the next unused target. Every endpoint is appended to the
 * repeated list, s itself m times. All draws come from the single stream (seed,
 * "barabasi-albert", 0): the process is sequential. Edges are listed by new node, in the order
 * added. (n - m) m edges, no self-loops, no repeats.
 * @param options - n, m, triadProbability and seed
 * @returns the undirected graph
 */
export function barabasiAlbertGraph(options: BarabasiAlbertOptions): SampleGraph {
    const { n, m, seed } = options;
    const triad = options.triadProbability ?? 0;
    checkInt("m", m, 1);
    checkInt("n", n, m + 1);
    checkProbability("triadProbability", triad);
    checkSeed(seed);
    const edgeCount = (n - m) * m;
    checkEdgeCount(edgeCount);
    const stream = new RandomStream(seed, "barabasi-albert", 0);
    const out = new EdgeBuffer(edgeCount);
    const repeated = new Uint32Array(m + 2 * edgeCount);
    let length = 0;
    for (let i = 0; i < m; i++) {
        repeated[length++] = i;
    }
    // neighbour lists, only for the triad step
    // ponytail: number[][] per node; a CSR-like growable adjacency if HK at 1M+ nodes matters
    const adjacency: number[][] | null = triad > 0 ? Array.from({ length: n }, () => []) : null;
    const targets = new Array<number>(m);
    const link = (s: number, t: number): void => {
        out.push(s, t);
        repeated[length++] = t;
        if (adjacency !== null) {
            adjacency[s].push(t);
            adjacency[t].push(s);
        }
    };
    for (let s = m; s < n; s++) {
        // m distinct targets from the repeated list, in draw order
        let found = 0;
        while (found < m) {
            const t = repeated[stream.nextBelow(length)];
            let fresh = true;
            for (let i = 0; i < found; i++) {
                fresh &&= targets[i] !== t;
            }
            if (fresh) {
                targets[found++] = t;
            }
        }
        let next = 0;
        let target = targets[next++];
        link(s, target);
        for (let count = 1; count < m; count++) {
            if (adjacency !== null && stream.nextFloat() < triad) {
                const mine = adjacency[s];
                const candidates = adjacency[target].filter((x) => x !== s && !mine.includes(x));
                if (candidates.length > 0) {
                    link(s, candidates[stream.nextBelow(candidates.length)]);
                    continue;
                }
            }
            // the next unused target (a triad step may already have joined s to it)
            do {
                target = targets[next++];
            } while (adjacency !== null && adjacency[s].includes(target) && next < m);
            if (adjacency !== null && adjacency[s].includes(target)) {
                // every planned target is taken: fall back to a fresh preferential draw
                do {
                    target = repeated[stream.nextBelow(length)];
                } while (target === s || adjacency[s].includes(target));
            }
            link(s, target);
        }
        for (let i = 0; i < m; i++) {
            repeated[length++] = s;
        }
    }
    return toGraph(n, out, false);
}

/** Options of {@link wattsStrogatzGraph}. */
export interface WattsStrogatzOptions {
    /** The node count, > k. */
    n: number;
    /** Each node's ring neighbours before rewiring, even, >= 2. */
    k: number;
    /** The rewiring probability of each edge, in [0, 1]. */
    beta: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * The Watts-Strogatz small world (D. J. Watts and S. H. Strogatz, "Collective dynamics of
 * 'small-world' networks", Nature 393, 440-442, 1998), as networkx's `watts_strogatz_graph`
 * builds it, in O(n k).
 *
 * Start from the ring lattice: edge slot u k/2 + (j - 1) holds (u, (u + j) mod n) for j = 1 .. k/2.
 * Then for j = 1 .. k/2 and u = 0 .. n - 1 in that order: draw a float; if it is below beta and u is
 * not already joined to every other node, redraw w = nextBelow(n) until w is neither u nor a
 * neighbour of u, and rewire the slot to (u, w). All draws come from the single stream (seed,
 * "watts-strogatz", 0). Edges are listed in slot order.
 * @param options - n, k, beta and seed
 * @returns the undirected graph
 */
export function wattsStrogatzGraph(options: WattsStrogatzOptions): SampleGraph {
    const { n, k, beta, seed } = options;
    checkInt("k", k, 2);
    if (k % 2 !== 0) {
        throw new RangeError(`k must be even, got ${k}`);
    }
    checkInt("n", n, k + 1);
    checkProbability("beta", beta);
    checkSeed(seed);
    const half = k / 2;
    const m = n * half;
    checkEdgeCount(m);
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    const degree = new Uint32Array(n).fill(k);
    // ponytail: a Set of u * n + v keys, fine to a few million edges; a hashed typed table beyond
    const edges = new Set<number>();
    const key = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
    for (let u = 0; u < n; u++) {
        for (let j = 1; j <= half; j++) {
            const v = (u + j) % n;
            src[u * half + j - 1] = u;
            dst[u * half + j - 1] = v;
            edges.add(key(u, v));
        }
    }
    const stream = new RandomStream(seed, "watts-strogatz", 0);
    for (let j = 1; j <= half; j++) {
        for (let u = 0; u < n; u++) {
            if (stream.nextFloat() >= beta || degree[u] >= n - 1) {
                continue;
            }
            let w = stream.nextBelow(n);
            while (w === u || edges.has(key(u, w))) {
                w = stream.nextBelow(n);
            }
            const slot = u * half + j - 1;
            const v = dst[slot];
            edges.delete(key(u, v));
            edges.add(key(u, w));
            degree[v]--;
            degree[w]++;
            dst[slot] = w;
        }
    }
    return { directed: false, nodeCount: n, src, dst };
}
