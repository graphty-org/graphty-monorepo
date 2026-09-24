/**
 * Sequential growth models: the random recursive tree, forest fire, duplication-divergence,
 * Newman-Watts, Bianconi-Barabasi fitness, the random Apollonian network and Wilson's uniform
 * spanning tree of a grid (a perfect maze). Each draws from one stream (seed, domain, 0): the
 * processes are sequential, so there is no row-parallel form.
 */

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** Options of {@link randomRecursiveTreeGraph}. */
export interface RandomRecursiveTreeOptions extends WeightOptions {
    /** The node count, >= 1. */
    n: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The random recursive tree (R. T. Smythe and H. M. Mahmoud, "A survey of recursive trees",
 * Theory Probab. Math. Statist. 51, 1-27, 1995): node t = 1 .. n - 1 attaches to a uniform earlier
 * node, drawn as nextBelow(t) from the stream (seed, "recursive-tree", 0). Edge t - 1 is
 * (parent, t), in t order. O(n). Depth about ln n, root degree about ln n.
 * @param options - n and seed
 * @returns the undirected tree
 */
export function randomRecursiveTreeGraph(options: RandomRecursiveTreeOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 1);
    const stream = new RandomStream(resolveSeed(options.seed), "recursive-tree", 0);
    const src = new Uint32Array(n - 1);
    const dst = new Uint32Array(n - 1);
    for (let t = 1; t < n; t++) {
        src[t - 1] = stream.nextBelow(t);
        dst[t - 1] = t;
    }
    return applyWeights({ directed: false, nodeCount: n, src, dst }, options);
}

/** Options of {@link forestFireGraph}. */
export interface ForestFireOptions extends WeightOptions {
    /** The node count, >= 1. */
    n: number;
    /** The forward burning probability p, in [0, 1). */
    forward: number;
    /** The backward burning ratio r >= 0; the backward burning probability r p must be below 1. */
    backward: number;
    /** The most nodes one new node may burn (and link to), >= 1; default 1000. */
    maxBurn?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Pick `count` of `candidates` uniformly without replacement (a partial Fisher-Yates shuffle in
 * place): the picks are candidates[0 .. count).
 * @param stream - the stream
 * @param candidates - the candidates, reordered in place
 * @param count - how many to pick, <= candidates.length
 */
function pickPrefix(stream: RandomStream, candidates: number[], count: number): void {
    for (let i = 0; i < count; i++) {
        const j = i + stream.nextBelow(candidates.length - i);
        const t = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = t;
    }
}

/**
 * The forest fire model (J. Leskovec, J. Kleinberg and C. Faloutsos, "Graphs over time:
 * densification laws, shrinking diameters and possible explanations", KDD 2005,
 * doi:10.1145/1081870.1081893). Directed; heavy-tailed degrees, densification, community locality.
 *
 * Node 0 starts alone. Each new node v = 1 .. n - 1 draws an ambassador w = nextBelow(v) and burns
 * breadth-first from it: for each burning node x in burn order, draw x_out = floor(ln(1 - u) / ln p)
 * (geometric, P(x_out >= k) = p^k, mean p / (1 - p)) and then x_in the same way with r p; then pick
 * x_out of x's out-neighbours and then x_in of its in-neighbours uniformly among those not yet
 * burned (adjacency order, partial Fisher-Yates; all of them when there are fewer), and burn them.
 * Burning stops at `maxBurn` nodes. v then links to every burned node: arcs (v, t) in burn order.
 * Edges are listed by v. All draws come from the stream (seed, "forest-fire", 0).
 *
 * Cost: O(sum over burning nodes of their degree), since each burning node's lists are scanned;
 * the edge count explodes for p above about 0.37, which `maxBurn` bounds at n maxBurn arcs.
 * @param options - n, forward, backward, maxBurn and seed
 * @returns the directed graph
 */
export function forestFireGraph(options: ForestFireOptions): SampleGraph {
    const { n, forward: p, backward: r } = options;
    const maxBurn = options.maxBurn ?? 1000;
    checkInt("n", n, 1);
    if (!(p >= 0 && p < 1)) {
        throw new RangeError(`forward must be a probability in [0, 1), got ${String(p)}`);
    }
    if (!(r >= 0 && r * p < 1)) {
        throw new RangeError(`backward must be >= 0 with backward * forward < 1, got ${String(r)}`);
    }
    checkInt("maxBurn", maxBurn, 1);
    const stream = new RandomStream(resolveSeed(options.seed), "forest-fire", 0);
    const pb = r * p;
    const logForward = detLog(p);
    const logBackward = detLog(pb);
    // ponytail: number[][] adjacency, fine to a few million arcs; a growable CSR beyond
    const out: number[][] = Array.from({ length: n }, () => []);
    const inn: number[][] = Array.from({ length: n }, () => []);
    const stamp = new Uint32Array(n);
    const edges = new EdgeBuffer(4 * n);
    const burned: number[] = [];
    const burn = (v: number, list: number[], count: number): void => {
        const candidates = list.filter((t) => stamp[t] !== v);
        const take = Math.min(count, candidates.length, maxBurn - burned.length);
        pickPrefix(stream, candidates, take);
        for (let i = 0; i < take; i++) {
            stamp[candidates[i]] = v;
            burned.push(candidates[i]);
        }
    };
    for (let v = 1; v < n; v++) {
        burned.length = 0;
        const w = stream.nextBelow(v);
        stamp[w] = v;
        burned.push(w);
        for (let head = 0; head < burned.length && burned.length < maxBurn; head++) {
            const x = burned[head];
            const xOut = p === 0 ? 0 : stream.nextSkip(logForward);
            const xIn = pb === 0 ? 0 : stream.nextSkip(logBackward);
            burn(v, out[x], xOut);
            burn(v, inn[x], xIn);
        }
        for (const t of burned) {
            edges.push(v, t);
            out[v].push(t);
            inn[t].push(v);
        }
    }
    return applyWeights(toGraph(n, edges, true), options);
}

/** Options of {@link duplicationDivergenceGraph}. */
export interface DuplicationDivergenceOptions extends WeightOptions {
    /** The node count, >= 2. */
    n: number;
    /** The probability that a duplicate keeps each of the original's edges, in (0, 1]. */
    retention: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The duplication-divergence model (I. Ispolatov, P. L. Krapivsky and A. Yuryev,
 * "Duplication-divergence model of protein interaction network", Phys. Rev. E 71, 061911, 2005,
 * doi:10.1103/PhysRevE.71.061911), as networkx's `duplication_divergence_graph`: protein-network
 * like, with many nodes sharing neighbours.
 *
 * Start with the edge (0, 1). While there are fewer than n nodes, draw a node x = nextBelow(i) for
 * the next index i, then one float per neighbour of x (in the order they were joined to x): below
 * `retention`, the edge (i, neighbour). If i got at least one edge it is kept, otherwise the attempt
 * is discarded. All draws come from the stream (seed, "duplication-divergence", 0). Edges are
 * listed by new node. Simple and connected.
 *
 * Cost: O(sum of the copied nodes' degrees). Each attempt succeeds with probability at least
 * `retention`; after 1000 n attempts in total it throws a RangeError rather than loop on.
 * @param options - n, retention and seed
 * @returns the undirected graph
 */
export function duplicationDivergenceGraph(options: DuplicationDivergenceOptions): SampleGraph {
    const { n, retention } = options;
    checkInt("n", n, 2);
    if (!(retention > 0 && retention <= 1)) {
        throw new RangeError(`retention must be a probability in (0, 1], got ${String(retention)}`);
    }
    const stream = new RandomStream(resolveSeed(options.seed), "duplication-divergence", 0);
    // ponytail: number[][] adjacency, fine to a few million edges; a growable CSR beyond
    const adj: number[][] = Array.from({ length: n }, () => []);
    const edges = new EdgeBuffer(4 * n);
    edges.push(0, 1);
    adj[0].push(1);
    adj[1].push(0);
    const maxAttempts = 1000 * n;
    let attempts = 0;
    for (let i = 2; i < n; ) {
        if (++attempts > maxAttempts) {
            throw new RangeError(
                `duplicationDivergenceGraph gave up after ${maxAttempts} attempts at ${i} of ${n} nodes: retention ${retention} is too small`,
            );
        }
        const copied = adj[stream.nextBelow(i)];
        for (const t of copied) {
            if (stream.nextFloat() < retention) {
                edges.push(i, t);
                adj[i].push(t);
            }
        }
        for (const t of adj[i]) {
            adj[t].push(i);
        }
        if (adj[i].length > 0) {
            i++;
        }
    }
    return applyWeights(toGraph(n, edges, false), options);
}

/** Options of {@link newmanWattsGraph}. */
export interface NewmanWattsOptions extends WeightOptions {
    /** The node count, > k. */
    n: number;
    /** Each node's ring neighbours, even, >= 2. */
    k: number;
    /** The probability of a shortcut per ring edge, in [0, 1]. */
    p: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The Newman-Watts small world (M. E. J. Newman and D. J. Watts, "Renormalization group analysis
 * of the small-world network model", Phys. Lett. A 263, 341-346, 1999,
 * doi:10.1016/S0375-9601(99)00757-4): Watts-Strogatz with shortcuts added instead of rewired, so
 * the graph stays connected.
 *
 * The ring lattice of `wattsStrogatzGraph` comes first: edge slot u k/2 + (j - 1) is
 * (u, (u + j) mod n). Then for each slot in order, with source u: draw a float; if it is below p and
 * u is not joined to every other node, redraw w = nextBelow(n) until w is neither u nor a
 * neighbour of u, and append the shortcut (u, w). All draws come from the stream (seed,
 * "newman-watts", 0). O(n k) expected.
 * @param options - n, k, p and seed
 * @returns the undirected graph
 */
export function newmanWattsGraph(options: NewmanWattsOptions): SampleGraph {
    const { n, k, p } = options;
    checkInt("k", k, 2);
    if (k % 2 !== 0) {
        throw new RangeError(`k must be even, got ${k}`);
    }
    checkInt("n", n, k + 1);
    checkProbability("p", p);
    const half = k / 2;
    const ring = n * half;
    checkEdgeCount(2 * ring);
    const edges = new EdgeBuffer(ring + Math.ceil(ring * p + 6 * Math.sqrt(ring) + 16));
    const degree = new Uint32Array(n).fill(k);
    // ponytail: a Set of u * n + v keys, like wattsStrogatzGraph; a hashed typed table beyond millions
    const present = new Set<number>();
    const key = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
    for (let u = 0; u < n; u++) {
        for (let j = 1; j <= half; j++) {
            const v = (u + j) % n;
            edges.push(u, v);
            present.add(key(u, v));
        }
    }
    const stream = new RandomStream(resolveSeed(options.seed), "newman-watts", 0);
    for (let slot = 0; slot < ring; slot++) {
        const u = edges.src[slot];
        if (stream.nextFloat() >= p || degree[u] >= n - 1) {
            continue;
        }
        let w = stream.nextBelow(n);
        while (w === u || present.has(key(u, w))) {
            w = stream.nextBelow(n);
        }
        edges.push(u, w);
        present.add(key(u, w));
        degree[u]++;
        degree[w]++;
    }
    return applyWeights(toGraph(n, edges, false), options);
}

/** Options of {@link bianconiBarabasiGraph}. */
export interface BianconiBarabasiOptions extends WeightOptions {
    /** The node count, > m. */
    n: number;
    /** The number of edges each new node brings, >= 1. */
    m: number;
    /**
     * Each node's fitness, n finite positive values; default uniform in (0, 1], node i's drawn as
     * 1 - nextFloat() from the stream (seed, "fitness", i).
     */
    fitness?: ArrayLike<number> | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The Bianconi-Barabasi fitness model (G. Bianconi and A.-L. Barabasi, "Competition and
 * multiscaling in evolving networks", Europhys. Lett. 54, 436-442, 2001,
 * doi:10.1209/epl/i2001-00260-6): preferential attachment weighted by fitness, so a fit latecomer
 * can overtake older hubs ("fit get richer").
 *
 * Start from the clique on nodes 0 .. m, edges (a, b) for a < b in lexicographic order. Each new
 * node s = m + 1 .. n - 1 picks m distinct existing nodes, one at a time, with probability
 * proportional to fitness_i * degree_i among those not yet picked: x = nextFloat() * total, then a
 * descent of a Fenwick tree over the Float64 weights. Edges (s, t) follow in pick order. Draws
 * come from the stream (seed, "bianconi-barabasi", 0). O(n m log n). Emits the Float64 node column
 * `fitness`.
 * @param options - n, m, fitness and seed
 * @returns the undirected graph
 */
export function bianconiBarabasiGraph(options: BianconiBarabasiOptions): SampleGraph {
    const { n, m } = options;
    checkInt("m", m, 1);
    checkInt("n", n, m + 1);
    const seed = resolveSeed(options.seed);
    checkEdgeCount((m * (m + 1)) / 2 + (n - m - 1) * m);
    const fitness = new Float64Array(n);
    if (options.fitness === undefined) {
        const draw = new RandomStream(seed, "fitness", 0);
        for (let i = 0; i < n; i++) {
            draw.reset(i);
            fitness[i] = 1 - draw.nextFloat();
        }
    } else {
        if (options.fitness.length !== n) {
            throw new RangeError(`fitness must have n = ${n} values, got ${options.fitness.length}`);
        }
        for (let i = 0; i < n; i++) {
            const f = options.fitness[i];
            if (!(f > 0 && Number.isFinite(f))) {
                throw new RangeError(`fitness[${i}] must be finite and positive, got ${String(f)}`);
            }
            fitness[i] = f;
        }
    }
    const edges = new EdgeBuffer((m * (m + 1)) / 2 + (n - m - 1) * m);
    const degree = new Uint32Array(n);
    for (let a = 0; a <= m; a++) {
        for (let b = a + 1; b <= m; b++) {
            edges.push(a, b);
        }
        degree[a] = m;
    }
    // Fenwick tree over weight[i] = fitness[i] * degree[i] (1-based internally)
    const weight = new Float64Array(n);
    const tree = new Float64Array(n + 1);
    const add = (i: number, delta: number): void => {
        weight[i] += delta;
        for (let j = i + 1; j <= n; j += j & -j) {
            tree[j] += delta;
        }
    };
    let top = 1;
    while (top * 2 <= n) {
        top *= 2;
    }
    const find = (x: number, limit: number): number => {
        let pos = 0;
        let rest = x;
        for (let step = top; step >= 1; step = Math.floor(step / 2)) {
            if (pos + step <= n && tree[pos + step] <= rest) {
                pos += step;
                rest -= tree[pos];
            }
        }
        // rounding guard: land on a node with weight, below the newcomer
        pos = Math.min(pos, limit - 1);
        while (weight[pos] === 0) {
            pos--;
        }
        return pos;
    };
    let total = 0;
    for (let i = 0; i <= m; i++) {
        add(i, fitness[i] * m);
        total += fitness[i] * m;
    }
    const stream = new RandomStream(seed, "bianconi-barabasi", 0);
    const picked = new Uint32Array(m);
    for (let s = m + 1; s < n; s++) {
        let remaining = total;
        for (let i = 0; i < m; i++) {
            const t = find(stream.nextFloat() * remaining, s);
            picked[i] = t;
            remaining -= weight[t];
            add(t, -weight[t]);
        }
        for (let i = 0; i < m; i++) {
            const t = picked[i];
            edges.push(s, t);
            degree[t]++;
            add(t, fitness[t] * degree[t]);
        }
        degree[s] = m;
        add(s, fitness[s] * m);
        total = 0;
        // recompute the total from the tree's roots so it never drifts from the tree
        for (let j = n; j > 0; j -= j & -j) {
            total += tree[j];
        }
    }
    return applyWeights(toGraph(n, edges, false, { fitness }), options);
}

/** Options of {@link randomApollonianGraph}. */
export interface RandomApollonianOptions extends WeightOptions {
    /** The node count, >= 3. */
    n: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The random Apollonian network (T. Zhou, G. Yan and B.-H. Wang, "Maximal planar networks with
 * large clustering coefficient and power-law degree distribution", Phys. Rev. E 71, 046141, 2005,
 * doi:10.1103/PhysRevE.71.046141; the deterministic one is J. S. Andrade et al., Phys. Rev. Lett. 94,
 * 018702, 2005): maximal planar, power-law degrees, high clustering.
 *
 * Start from the triangle 0, 1, 2 (edges (0, 1), (0, 2), (1, 2)) whose inner face is face 0; the
 * outer face is never split. Each new node v = 3 .. n - 1 picks face f = nextBelow(faceCount) =
 * (a, b, c), adds the edges (v, a), (v, b), (v, c), and splits f: face f becomes (a, b, v), and
 * (b, c, v) and (a, c, v) are appended. Draws come from the stream (seed, "apollonian", 0).
 * 3n - 6 edges. O(n).
 * @param options - n and seed
 * @returns the undirected graph
 */
export function randomApollonianGraph(options: RandomApollonianOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 3);
    const m = 3 * n - 6;
    checkEdgeCount(m);
    const stream = new RandomStream(resolveSeed(options.seed), "apollonian", 0);
    const faces = 2 * n - 5;
    const fa = new Uint32Array(faces);
    const fb = new Uint32Array(faces);
    const fc = new Uint32Array(faces);
    fa[0] = 0;
    fb[0] = 1;
    fc[0] = 2;
    let faceCount = 1;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    src.set([0, 0, 1]);
    dst.set([1, 2, 2]);
    let e = 3;
    for (let v = 3; v < n; v++) {
        const f = stream.nextBelow(faceCount);
        const a = fa[f];
        const b = fb[f];
        const c = fc[f];
        src.fill(v, e, e + 3);
        dst[e++] = a;
        dst[e++] = b;
        dst[e++] = c;
        fc[f] = v;
        fa[faceCount] = b;
        fb[faceCount] = c;
        fc[faceCount++] = v;
        fa[faceCount] = a;
        fb[faceCount] = c;
        fc[faceCount++] = v;
    }
    return applyWeights({ directed: false, nodeCount: n, src, dst }, options);
}

/** Options of {@link wilsonMazeGraph}. */
export interface WilsonMazeOptions extends WeightOptions {
    /** The number of rows, >= 1. */
    rows: number;
    /** The number of columns, >= 1. */
    cols: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * A uniform spanning tree of the rows x cols grid, a perfect maze, by Wilson's algorithm
 * (D. B. Wilson, "Generating random spanning trees more quickly than the cover time", STOC 1996,
 * doi:10.1145/237814.237880): loop-erased random walks.
 *
 * Node (r, c) is index r cols + c. The root is node 0. For each start node in index order that is
 * not yet in the tree, walk until the tree is hit, each step to a uniform grid neighbour
 * (candidates in the order left, right, up, down; nextBelow(count)), remembering only the last exit
 * from each node (which erases the loops); then add the path: edges (u, next(u)) from the start to
 * the tree, in that order. Draws come from the stream (seed, "wilson", 0). rows cols - 1 edges.
 * Float64 node columns `x` = column and `y` = row. Expected cost is the mean hitting time of the
 * root, about O(n log n) on a grid.
 * @param options - rows, cols and seed
 * @returns the undirected tree
 */
export function wilsonMazeGraph(options: WilsonMazeOptions): SampleGraph {
    const { rows, cols } = options;
    checkInt("rows", rows, 1);
    checkInt("cols", cols, 1);
    const n = rows * cols;
    checkInt("rows * cols", n, 1);
    const stream = new RandomStream(resolveSeed(options.seed), "wilson", 0);
    const inTree = new Uint8Array(n);
    const next = new Uint32Array(n);
    const src = new Uint32Array(n - 1);
    const dst = new Uint32Array(n - 1);
    const options4 = new Uint32Array(4);
    inTree[0] = 1;
    let e = 0;
    for (let start = 1; start < n; start++) {
        let u = start;
        while (inTree[u] === 0) {
            const r = Math.floor(u / cols);
            const c = u - r * cols;
            let count = 0;
            if (c > 0) {
                options4[count++] = u - 1;
            }
            if (c + 1 < cols) {
                options4[count++] = u + 1;
            }
            if (r > 0) {
                options4[count++] = u - cols;
            }
            if (r + 1 < rows) {
                options4[count++] = u + cols;
            }
            next[u] = options4[stream.nextBelow(count)];
            u = next[u];
        }
        for (u = start; inTree[u] === 0; u = next[u]) {
            inTree[u] = 1;
            src[e] = u;
            dst[e++] = next[u];
        }
    }
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        y[i] = Math.floor(i / cols);
        x[i] = i - y[i] * cols;
    }
    return applyWeights({ directed: false, nodeCount: n, src, dst, nodeColumns: { x, y } }, options);
}
