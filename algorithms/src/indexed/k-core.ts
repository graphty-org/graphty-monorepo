import type { GraphSnapshot, U32 } from "@graphty/graph-format";

/**
 * Result of the index-based k-core decomposition. `coreness` is the shape the accelerator seam
 * declares (`CorenessResultLike`); `maxCore` and `cores()` are what the legacy
 * `kCoreDecomposition` returns as `maxCore` and its `cores` map.
 * @public
 */
export interface CorenessResult {
    /** Core number per node index. */
    readonly coreness: U32;
    /** The largest core number present; 0 on an empty graph. */
    readonly maxCore: number;
    /**
     * Node indices grouped by core number, computed once and cached: `cores()[k]` holds the nodes
     * whose coreness is exactly k, so the array has `maxCore + 1` entries.
     * @returns One array per core number
     */
    cores(): U32[];
}

/**
 * Core number of every node, by the Batagelj-Zaversnik bucket peel: O(nodes + arcs), no priority
 * queue and no per-node object.
 *
 * Core numbers are defined on a SIMPLE graph, so a parallel arc counts once (parallels are
 * adjacent within a row, invariant I4) and a self-loop does not count at all, as NetworkX defines
 * it. The legacy implementation's adjacency-of-sets counts a self-loop as one neighbour, so there a
 * node with a self-loop can sit higher, and so can a node without one whose core leaned on
 * self-looped neighbours. The result equals the legacy function's on the graph with every
 * self-loop removed.
 * @param s - An undirected snapshot
 * @returns The core numbers, the largest of them, and the lazy grouping
 * @public
 */
export function kCoreDecomposition(s: GraphSnapshot): CorenessResult {
    if (s.directed) {
        throw new Error("k-core requires an undirected graph. Pass s.toUndirected().snapshot.");
    }
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    // degree[] is peeled in place: when a node is visited its entry is already its core number.
    const degree = new Uint32Array(n);
    let maxDegree = 0;
    for (let u = 0; u < n; u++) {
        let d = 0;
        let last = -1;
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[a];
            if (v !== u && v !== last) {
                d++;
            }
            last = v;
        }
        degree[u] = d;
        if (d > maxDegree) {
            maxDegree = d;
        }
    }
    // Bucket sort the nodes by degree; bin[d] is the start of degree d's block in vert.
    const bin = new Uint32Array(maxDegree + 1);
    for (let u = 0; u < n; u++) {
        bin[degree[u]]++;
    }
    let start = 0;
    for (let d = 0; d <= maxDegree; d++) {
        const count = bin[d];
        bin[d] = start;
        start += count;
    }
    const vert = new Uint32Array(n);
    const pos = new Uint32Array(n);
    for (let u = 0; u < n; u++) {
        pos[u] = bin[degree[u]];
        vert[pos[u]] = u;
        bin[degree[u]]++;
    }
    for (let d = maxDegree; d > 0; d--) {
        bin[d] = bin[d - 1];
    }
    bin[0] = 0;
    // Peel in nondecreasing degree order. A neighbour of higher degree swaps to the front of its
    // bucket and loses one, which keeps vert sorted without re-sorting it.
    let maxCore = 0;
    for (let i = 0; i < n; i++) {
        const v = vert[i];
        const dv = degree[v];
        if (dv > maxCore) {
            maxCore = dv;
        }
        const end = rowPtr[v + 1];
        let last = -1;
        for (let a = rowPtr[v]; a < end; a++) {
            const u = colIdx[a];
            const skip = u === v || u === last;
            last = u;
            if (skip) {
                continue;
            }
            const du = degree[u];
            if (du > dv) {
                const pu = pos[u];
                const pw = bin[du];
                const w = vert[pw];
                if (u !== w) {
                    vert[pu] = w;
                    vert[pw] = u;
                    pos[u] = pw;
                    pos[w] = pu;
                }
                bin[du]++;
                degree[u] = du - 1;
            }
        }
    }
    let cached: U32[] | null = null;
    return {
        coreness: degree,
        maxCore,
        cores(): U32[] {
            if (cached === null) {
                const sizes = new Uint32Array(maxCore + 1);
                for (let u = 0; u < n; u++) {
                    sizes[degree[u]]++;
                }
                const out: U32[] = [];
                for (let k = 0; k <= maxCore; k++) {
                    out.push(new Uint32Array(sizes[k]));
                }
                const fill = new Uint32Array(maxCore + 1);
                for (let u = 0; u < n; u++) {
                    const k = degree[u];
                    out[k][fill[k]++] = u;
                }
                cached = out;
            }
            return cached;
        },
    };
}
