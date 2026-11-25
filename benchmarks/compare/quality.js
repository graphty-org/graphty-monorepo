// Layout quality measures, the same for every library: plain functions over typed arrays, no DOM, so the page
// (main.js) and a Node test (quality.test.mjs) run the same code. Every measure is scale-free, because the libraries
// lay out in different units.
//
//   stress        mean of (s * layout distance / hop distance - 1)^2 over pairs from `pivots` BFS sources, with
//                 the one scale s that minimizes it; 0 is a drawing whose distances are the hop distances. Lower is better.
//   edgeSpread    coefficient of variation (standard deviation / mean) of every edge's length. Lower is better.
//   neighborhood  for each sampled node with k graph neighbors, the share of its k nearest nodes in the drawing that
//                 are graph neighbors; 1 is perfect. Higher is better.
//   silhouette    the mean silhouette of the sampled nodes against the planted communities: (b - a) / max(a, b), where
//                 a is the mean distance to the node's own community and b the smallest mean distance to another;
//                 1 is tight, well-separated communities, 0 is no separation. Higher is better.
//   purity        for each sampled node, the share of its 10 nearest nodes in the drawing that are in its community.

/**
 * A seeded generator in [0, 1).
 * @param {number} a - The seed.
 * @returns {() => number} The generator.
 */
function rng(a) {
    return () => {
        a = (a + 0x6d2b79f5) | 0; // eslint-disable-line unicorn/prefer-math-trunc -- int32 wrap
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Undirected adjacency in compressed sparse rows, with self loops and repeated edges dropped from the rows.
 * @param {number} n - Nodes.
 * @param {ArrayLike<number>} src - Edge sources.
 * @param {ArrayLike<number>} dst - Edge targets.
 * @returns {{ off: Uint32Array, adj: Uint32Array }} Row offsets and neighbors.
 */
export function adjacency(n, src, dst) {
    const deg = new Uint32Array(n + 1);
    for (let e = 0; e < src.length; e++) {
        if (src[e] === dst[e]) continue;
        deg[src[e]]++;
        deg[dst[e]]++;
    }
    const off = new Uint32Array(n + 1);
    for (let i = 0; i < n; i++) off[i + 1] = off[i] + deg[i];
    const fill = off.slice(0, n);
    const adj = new Uint32Array(off[n]);
    for (let e = 0; e < src.length; e++) {
        if (src[e] === dst[e]) continue;
        adj[fill[src[e]]++] = dst[e];
        adj[fill[dst[e]]++] = src[e];
    }
    return { off, adj };
}

const dist = (p, i, j) => Math.hypot(p[3 * i] - p[3 * j], p[3 * i + 1] - p[3 * j + 1], p[3 * i + 2] - p[3 * j + 2]);

/**
 * The coefficient of variation of the edge lengths.
 * @param {{ src: ArrayLike<number>, dst: ArrayLike<number> }} g - The graph.
 * @param {Float32Array | Float64Array} p - Positions.
 * @returns {number} Standard deviation over mean.
 */
function edgeSpread(g, p) {
    let s1 = 0,
        s2 = 0,
        ne = 0;
    for (let e = 0; e < g.src.length; e++) {
        if (g.src[e] === g.dst[e]) continue;
        const d = dist(p, g.src[e], g.dst[e]);
        s1 += d;
        s2 += d * d;
        ne++;
    }
    const mean = s1 / ne;
    return Math.sqrt(Math.max(0, s2 / ne - mean * mean)) / mean;
}

/**
 * Hop distances from one node, breadth first.
 * @param {{ off: Uint32Array, adj: Uint32Array }} csr - Adjacency.
 * @param {number} src - The start.
 * @param {Int32Array} hops - Receives the hop count, -1 where unreachable.
 * @param {Uint32Array} queue - Scratch; on return its first `reached` entries are the reached nodes.
 * @returns {number} How many nodes were reached, the start included.
 */
function bfs({ off, adj }, src, hops, queue) {
    hops.fill(-1);
    hops[src] = 0;
    let head = 0,
        tail = 0;
    queue[tail++] = src;
    while (head < tail) {
        const u = queue[head++];
        for (let a = off[u]; a < off[u + 1]; a++) {
            if (hops[adj[a]] < 0) {
                hops[adj[a]] = hops[u] + 1;
                queue[tail++] = adj[a];
            }
        }
    }
    return tail;
}

/**
 * Stress against hop distance from BFS pivots. With weights 1 / d^2 the best scale is sum(e / d) / sum(e^2 / d^2),
 * and the stress is the mean of (s e / d - 1)^2.
 * @param {number} n - Nodes.
 * @param {Float32Array | Float64Array} p - Positions.
 * @param {{ off: Uint32Array, adj: Uint32Array }} csr - Adjacency.
 * @param {number} pivots - BFS sources.
 * @param {() => number} r - The generator that picks them.
 * @returns {number} The stress.
 */
function stress(n, p, csr, pivots, r) {
    const hops = new Int32Array(n);
    const queue = new Uint32Array(n);
    const ratios = [];
    for (let k = 0; k < pivots; k++) {
        const src = Math.floor(r() * n);
        const reached = bfs(csr, src, hops, queue);
        for (let q = 1; q < reached; q++) ratios.push(dist(p, src, queue[q]) / hops[queue[q]]);
    }
    let sr = 0,
        sr2 = 0;
    for (const x of ratios) {
        sr += x;
        sr2 += x * x;
    }
    const scale = sr2 > 0 ? sr / sr2 : 0;
    let sum = 0;
    for (const x of ratios) sum += (scale * x - 1) ** 2;
    return sum / (ratios.length || 1);
}

/**
 * One sampled node's silhouette against the communities, from its distances to every node.
 * @param {Float64Array} d - Distances from the node (Infinity at the node itself).
 * @param {ArrayLike<number>} community - Community of every node.
 * @param {number} own - The node's community.
 * @param {Float64Array} groupSize - Nodes per community.
 * @param {Float64Array} groupSum - Scratch, one per community.
 * @returns {number} (b - a) / max(a, b).
 */
function silhouette(d, community, own, groupSize, groupSum) {
    groupSum.fill(0);
    for (let j = 0; j < d.length; j++) if (d[j] !== Infinity) groupSum[community[j]] += d[j];
    const a = groupSize[own] > 1 ? groupSum[own] / (groupSize[own] - 1) : 0;
    let b = Infinity;
    for (let c = 0; c < groupSize.length; c++)
        if (c !== own && groupSize[c] > 0) b = Math.min(b, groupSum[c] / groupSize[c]);
    return (b - a) / Math.max(a, b);
}

/**
 * The measures of one drawing.
 * @param {{ n: number, src: ArrayLike<number>, dst: ArrayLike<number>, community?: ArrayLike<number> }} g - The graph.
 * @param {Float32Array | Float64Array} p - x, y and z of every node (z 0 in 2D).
 * @param {{ pivots?: number, samples?: number, seed?: number, csr?: { off: Uint32Array, adj: Uint32Array } }} [o] - Sample sizes.
 * @returns {{ stress: number, edgeSpread: number, neighborhood: number, silhouette: number | null, purity: number | null }} The measures.
 */
export function layoutQuality(g, p, o = {}) {
    const { n, community } = g;
    const csr = o.csr ?? adjacency(n, g.src, g.dst);
    const { off, adj } = csr;
    const r = rng(o.seed ?? 1910);
    const stressValue = stress(n, p, csr, Math.min(o.pivots ?? 32, n), r);

    // Neighborhood, silhouette and purity from one pass of distances per sampled node.
    let groups = 0;
    if (community) for (let i = 0; i < n; i++) groups = Math.max(groups, community[i] + 1);
    const groupSize = new Float64Array(groups);
    if (community) for (let i = 0; i < n; i++) groupSize[community[i]]++;
    const groupSum = new Float64Array(groups);
    const d = new Float64Array(n);
    const nb = [],
        sil = [],
        pur = [];
    for (let t = Math.min(o.samples ?? 500, n); t > 0; t--) {
        const i = Math.floor(r() * n);
        for (let j = 0; j < n; j++) d[j] = dist(p, i, j);
        d[i] = Infinity;
        const nbrs = new Set(adj.subarray(off[i], off[i + 1]));
        const near = nearest(d, Math.max(nbrs.size, community ? 10 : 0));
        if (nbrs.size > 0) nb.push(near.slice(0, nbrs.size).filter((j) => nbrs.has(j)).length / nbrs.size);
        if (groups > 1) {
            sil.push(silhouette(d, community, community[i], groupSize, groupSum));
            pur.push(near.slice(0, 10).filter((j) => community[j] === community[i]).length / 10);
        }
    }
    const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4) : null);
    return {
        stress: +stressValue.toFixed(4),
        edgeSpread: +edgeSpread(g, p).toFixed(4),
        neighborhood: mean(nb) ?? 0,
        silhouette: mean(sil),
        purity: mean(pur),
    };
}

/**
 * The indices of the k smallest values, nearest first (a bounded max-heap, so O(n log k)).
 * @param {Float64Array} d - Values.
 * @param {number} k - How many.
 * @returns {number[]} Indices.
 */
export function nearest(d, k) {
    const heap = []; // max-heap on d, of indices
    const up = (x) => {
        while (x > 0) {
            const parent = (x - 1) >> 1;
            if (d[heap[parent]] >= d[heap[x]]) break;
            [heap[parent], heap[x]] = [heap[x], heap[parent]];
            x = parent;
        }
    };
    const down = (x) => {
        for (;;) {
            const l = 2 * x + 1,
                rr = l + 1;
            let big = x;
            if (l < heap.length && d[heap[l]] > d[heap[big]]) big = l;
            if (rr < heap.length && d[heap[rr]] > d[heap[big]]) big = rr;
            if (big === x) return;
            [heap[big], heap[x]] = [heap[x], heap[big]];
            x = big;
        }
    };
    if (k <= 0) return [];
    for (let j = 0; j < d.length; j++) {
        if (heap.length < k) {
            heap.push(j);
            up(heap.length - 1);
        } else if (d[j] < d[heap[0]]) {
            heap[0] = j;
            down(0);
        }
    }
    return heap.sort((x, y) => d[x] - d[y]);
}
